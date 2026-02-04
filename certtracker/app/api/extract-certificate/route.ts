import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getSupabaseServer } from '@/lib/supabase-server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCurrency(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Dice-coefficient fuzzy match (returns 0–1)
function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const s2 = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  function bigrams(str: string): Map<string, number> {
    const map = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.substring(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  }

  const b1 = bigrams(s1);
  const b2 = bigrams(s2);
  let intersection = 0;
  for (const [bg, count] of b1) {
    intersection += Math.min(count, b2.get(bg) || 0);
  }
  const total = (s1.length - 1) + (s2.length - 1);
  return total === 0 ? 0 : (2 * intersection) / total;
}

// ---------------------------------------------------------------------------
// Fetch venue settings (with safe fallback)
// ---------------------------------------------------------------------------

const SETTINGS_DEFAULTS = {
  venue_name: '',
  venue_address: '',
  min_gl_limit: 1000000,
  min_aggregate_limit: 2000000,
  max_deductible: 5000,
  required_ai_text: '',
  require_subr_wvd: false,
  require_liquor: false,
  min_liquor_limit: 1000000,
  strict_workers_comp: false,
  enforce_auto_owned: true,
  min_auto_limit: 1000000,
  min_umbrella_limit: 0,
  allow_claims_made: false,
  require_primary_non_contributory: true,
  expiration_buffer_days: 0,
  validation_mode: 'warning',
};

async function fetchVenueSettings(): Promise<typeof SETTINGS_DEFAULTS> {
  try {
    const { data, error } = await supabase
      .from('venue_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) return SETTINGS_DEFAULTS;
    return { ...SETTINGS_DEFAULTS, ...data };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

async function fetchEventName(eventId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();
    return data?.name || 'Unknown Event';
  } catch {
    return 'Unknown Event';
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Issue = {
  severity: 'error' | 'warning' | 'info';
  field: string;
  issue: string;
  detail: string;
};

function validateCertificate(
  data: any,
  eventDate: string,
  vendorType: string,
  settings: typeof SETTINGS_DEFAULTS
): Issue[] {
  const issues: Issue[] = [];
  const isStrict = settings.validation_mode === 'strict';

  // In warning mode, errors become warnings so the user can still approve
  const add = (severity: 'error' | 'warning' | 'info', field: string, issue: string, detail: string) => {
    const eff = (!isStrict && severity === 'error') ? 'warning' : severity;
    issues.push({ severity: eff, field, issue, detail });
  };

  // ------------------------------------------------------------------
  // Pre-check: Critical null fields → warning (forces Review status)
  // ------------------------------------------------------------------
  const criticalNulls: { field: string; label: string }[] = [
    { field: 'producer_name', label: 'Producer Name' },
    { field: 'insured_name', label: 'Insured Name' },
    { field: 'gl_policy_number', label: 'GL Policy Number' },
    { field: 'gl_effective_date', label: 'GL Effective Date' },
  ];
  for (const { field, label } of criticalNulls) {
    if (!data[field]) {
      issues.push({
        severity: 'warning',
        field: label,
        issue: `${label} not extracted`,
        detail: `${label} is a required field on an ACORD 25 form. Manual review is needed.`,
      });
    }
  }

  // ------------------------------------------------------------------
  // Step 1: Identity Check + Active Window
  // ------------------------------------------------------------------
  if (settings.venue_name && settings.venue_name.trim()) {
    if (data.certificate_holder) {
      const score = fuzzyMatch(String(data.certificate_holder), settings.venue_name);
      if (score < 0.85) {
        add('error', 'Certificate Holder', 'Certificate Holder does not match Venue Name',
          `Match score: ${Math.round(score * 100)}%. Found: "${data.certificate_holder}". Expected venue: "${settings.venue_name}".`);
      }
    } else {
      add('error', 'Certificate Holder', 'Certificate Holder not found',
        'The Certificate Holder box (bottom left) must contain the venue name.');
    }
  }

  // Active window: policy effective date must be on or before event date
  if (data.gl_effective_date && eventDate) {
    const effDate = new Date(data.gl_effective_date);
    const evDate = new Date(eventDate);
    effDate.setHours(0, 0, 0, 0);
    evDate.setHours(0, 0, 0, 0);
    if (effDate > evDate) {
      add('error', 'Effective Date', 'Policy is not yet active on event date',
        `Policy effective date is ${data.gl_effective_date} but the event is on ${eventDate}. Coverage must be active by the event.`);
    }
  }

  // ------------------------------------------------------------------
  // Step 2: Date / Expiration Check with buffer
  // ------------------------------------------------------------------
  if (data.gl_expiration_date) {
    const expDate = new Date(data.gl_expiration_date);
    const evDate = new Date(eventDate);
    const bufferDays = Number(settings.expiration_buffer_days) || 0;
    const requiredDate = new Date(evDate);
    requiredDate.setDate(requiredDate.getDate() + bufferDays);

    if (expDate < new Date()) {
      add('error', 'Expiration Date', 'Policy has expired',
        `Policy expired on ${data.gl_expiration_date}. A current policy is required.`);
    } else if (expDate < requiredDate) {
      if (bufferDays > 0) {
        add('error', 'Expiration Date', 'Policy expires before required buffer date',
          `Policy expires ${data.gl_expiration_date}. Must be valid through ${requiredDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (event date + ${bufferDays}-day buffer).`);
      } else {
        add('error', 'Expiration Date', 'Policy expires before event date',
          `Policy expires ${data.gl_expiration_date}. Event date is ${eventDate}.`);
      }
    }
  } else {
    add('error', 'Expiration Date', 'GL Expiration date not found',
      'The General Liability expiration date must be clearly visible.');
  }

  // ------------------------------------------------------------------
  // Step 3: Liability Thresholds + Umbrella Stack + Endorsement Scans
  // ------------------------------------------------------------------
  const minGl = Number(settings.min_gl_limit) || 1000000;
  const glLimit = parseCurrency(data.gl_each_occurrence_limit);
  const umbrellaLimit = parseCurrency(data.umbrella_liability_limit);

  if (glLimit !== null) {
    if (glLimit < minGl) {
      // Try umbrella stack
      if (umbrellaLimit !== null && (glLimit + umbrellaLimit) >= minGl) {
        issues.push({
          severity: 'info',
          field: 'General Liability',
          issue: 'Coverage met via Umbrella stacking',
          detail: `GL Each Occurrence: ${formatCurrency(glLimit)} + Umbrella: ${formatCurrency(umbrellaLimit)} = ${formatCurrency(glLimit + umbrellaLimit)} (minimum: ${formatCurrency(minGl)}).`,
        });
      } else {
        add('error', 'General Liability', 'Coverage limits insufficient',
          `GL Each Occurrence: ${formatCurrency(glLimit)}. Minimum required: ${formatCurrency(minGl)}.${umbrellaLimit !== null ? ` Umbrella: ${formatCurrency(umbrellaLimit)} — combined still insufficient.` : ' No Umbrella coverage found.'}`);
      }
    }
  } else {
    add('error', 'General Liability', 'GL Each Occurrence limit not found',
      'General Liability Each Occurrence coverage amount must be clearly stated.');
  }

  // Aggregate limit
  const minAggregate = Number(settings.min_aggregate_limit) || 2000000;
  const aggregateLimit = parseCurrency(data.gl_general_aggregate_limit);
  if (aggregateLimit !== null) {
    if (aggregateLimit < minAggregate) {
      add('error', 'Aggregate Limit', 'Insufficient aggregate limit',
        `Found: ${formatCurrency(aggregateLimit)}. Minimum required: ${formatCurrency(minAggregate)}.`);
    }
  } else {
    add('error', 'Aggregate Limit', 'GL General Aggregate limit not found',
      'General Aggregate coverage amount must be clearly stated.');
  }

  // Description-of-operations keyword auto-scans
  const desc = (data.description_of_operations || '').toLowerCase();

  // Venue name presence in description
  if (settings.venue_name && settings.venue_name.trim()) {
    const venueNameLower = settings.venue_name.toLowerCase();
    if (!desc.includes(venueNameLower)) {
      issues.push({
        severity: 'info',
        field: 'Description of Operations',
        issue: 'Venue name not mentioned in Description of Operations',
        detail: `"${settings.venue_name}" does not appear in the Description of Operations. This may be acceptable but should be verified.`,
      });
    }
  }

  // Primary & Non-Contributory endorsement scan
  if (settings.require_primary_non_contributory) {
    const pncPhrases = [
      'primary and non-contributory',
      'primary & non-contributory',
      'primary and noncontributory',
      'primary & noncontributory',
    ];
    const hasPnc = pncPhrases.some(phrase => desc.includes(phrase));
    if (!hasPnc) {
      add('error', 'Primary & Non-Contributory', 'P&NC endorsement language not found',
        'Required "Primary and Non-Contributory" language was not found in the Description of Operations.');
    }
  }

  // Required additional-insured text
  if (settings.required_ai_text && settings.required_ai_text.trim()) {
    const required = settings.required_ai_text.toLowerCase().trim();
    if (!desc.includes(required)) {
      add('error', 'Description of Operations', 'Missing required Additional Insured language',
        `Required text: "${settings.required_ai_text}" was not found in the Description of Operations.`);
    }
  }

  // Waiver of Subrogation checkbox
  if (settings.require_subr_wvd && data.gl_subr_wvd !== true) {
    add('error', 'Waiver of Subrogation', 'SUBR WVD not checked',
      'The Waiver of Subrogation (SUBR WVD) checkbox must be checked on the General Liability line.');
  }

  // Waiver of Subrogation text scan (complementary — checkbox checked but no language)
  if (settings.require_subr_wvd && data.gl_subr_wvd === true) {
    const subrPhrases = ['waiver of subrogation', 'subrogation waiver'];
    if (!subrPhrases.some(phrase => desc.includes(phrase))) {
      issues.push({
        severity: 'info',
        field: 'Waiver of Subrogation',
        issue: 'SUBR WVD checked but waiver language not in Description',
        detail: 'The SUBR WVD checkbox is checked but explicit waiver language was not found in Description of Operations. Verify endorsement is attached.',
      });
    }
  }

  // Additional Insured checkbox warning
  if (data.gl_addl_insured === false) {
    issues.push({
      severity: 'warning',
      field: 'Additional Insured',
      issue: 'Additional Insured checkbox not checked',
      detail: 'The ADDL INSD checkbox is not checked for General Liability. Verify this is acceptable.',
    });
  }

  // ------------------------------------------------------------------
  // Step 4: Policy Structure Risk
  // ------------------------------------------------------------------
  // Claims-Made policy check
  if (data.gl_occurrence_type === 'CLAIMS-MADE') {
    if (!settings.allow_claims_made) {
      add('error', 'Policy Type', 'Claims-Made policy detected — HIGH RISK',
        'This policy is written on a Claims-Made basis. Your venue requires Occurrence-based policies. A Claims-Made policy only covers claims filed during the policy period, not claims for incidents that occur during the policy period.');
    } else {
      issues.push({
        severity: 'info',
        field: 'Policy Type',
        issue: 'Claims-Made policy — allowed',
        detail: 'This policy is written on a Claims-Made basis. Claims-Made policies are permitted per your venue settings.',
      });
    }
  }

  // Umbrella deductible vs max deductible
  const umbrellaDeductible = parseCurrency(data.umbrella_deductible);
  if (umbrellaDeductible !== null && umbrellaDeductible > Number(settings.max_deductible)) {
    issues.push({
      severity: 'warning',
      field: 'Umbrella Deductible',
      issue: 'Umbrella deductible exceeds venue maximum',
      detail: `Umbrella deductible: ${formatCurrency(umbrellaDeductible)}. Maximum allowed: ${formatCurrency(Number(settings.max_deductible))}. Verify this is acceptable.`,
    });
  }

  // ------------------------------------------------------------------
  // Step 5: Conditional Smart Checks
  // ------------------------------------------------------------------
  const vendorTypeLower = (vendorType || '').toLowerCase();
  const isAlcoholVendor = ['catering/bar', 'alcohol service'].includes(vendorTypeLower);
  const isAutoRelevant = ['caterer', 'catering/bar', 'food truck', 'transportation', 'shuttle'].includes(vendorTypeLower);

  // Liquor Liability
  if (settings.require_liquor && isAlcoholVendor) {
    const minLiquor = Number(settings.min_liquor_limit) || 1000000;
    const liquorLimit = parseCurrency(data.liquor_liability_limit);
    if (liquorLimit === null || liquorLimit < minLiquor) {
      add('error', 'Liquor Liability', 'Vendor is serving alcohol but missing or insufficient Liquor Liability coverage',
        liquorLimit !== null
          ? `Found: ${formatCurrency(liquorLimit)}. Minimum required: ${formatCurrency(minLiquor)}.`
          : `No Liquor Liability coverage found. Minimum required: ${formatCurrency(minLiquor)}.`);
    }
  }

  // Auto Liability
  if (isAutoRelevant) {
    const minAuto = Number(settings.min_auto_limit) || 1000000;
    const autoLimit = parseCurrency(data.auto_liability_limit);
    if (autoLimit === null || autoLimit < minAuto) {
      add('error', 'Auto Liability', `${vendorType} vendor requires Auto Liability coverage`,
        autoLimit !== null
          ? `Found: ${formatCurrency(autoLimit)}. Minimum required: ${formatCurrency(minAuto)}.`
          : `No Auto Liability coverage found. Minimum required: ${formatCurrency(minAuto)}.`);
    }
    // Owned vehicle enforcement
    if (settings.enforce_auto_owned && data.auto_coverage_type) {
      if (!data.auto_coverage_type.owned) {
        add('error', 'Auto Liability', 'Owned vehicles not covered',
          'Your venue requires "Owned" auto coverage. The Auto Liability section does not show coverage for owned vehicles.');
      }
    }
  }

  // Umbrella minimum threshold
  const minUmbrella = Number(settings.min_umbrella_limit) || 0;
  if (minUmbrella > 0) {
    if (umbrellaLimit === null || umbrellaLimit < minUmbrella) {
      add('error', 'Umbrella / Excess', 'Umbrella coverage below minimum',
        umbrellaLimit !== null
          ? `Found: ${formatCurrency(umbrellaLimit)}. Minimum required: ${formatCurrency(minUmbrella)}.`
          : `No Umbrella/Excess coverage found. Minimum required: ${formatCurrency(minUmbrella)}.`);
    }
  }

  // Workers Compensation with sole-proprietor bypass
  if (settings.strict_workers_comp) {
    if (data.wc_proprietor_excluded === true) {
      issues.push({
        severity: 'info',
        field: 'Workers Compensation',
        issue: 'Sole Proprietor Exemption noted',
        detail: 'Workers Compensation requirement is waived — Sole Proprietor exclusion is noted on the certificate.',
      });
    } else if (!data.workers_comp_limit) {
      add('error', 'Workers Compensation', 'Workers Compensation coverage required',
        'Strict Workers Comp enforcement is enabled. Workers Compensation coverage must be present.');
    }
  }

  // ------------------------------------------------------------------
  // All clear
  // ------------------------------------------------------------------
  if (issues.length === 0) {
    issues.push({
      severity: 'info',
      field: 'Review',
      issue: 'All automated checks passed',
      detail: 'Please perform final human review before approving.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Email Payload Generator
// ---------------------------------------------------------------------------

function generateEmailPayload(
  vendorName: string,
  eventName: string,
  issues: Issue[],
  status: string
): { subject: string; body: string } | null {
  if (status === 'green') return null;

  const actionable = issues.filter(i => i.severity === 'error' || i.severity === 'warning');
  if (actionable.length === 0) return null;

  const statusLabel = status === 'red' ? 'Rejected' : 'Requires Review';
  const subject = `Certificate ${statusLabel} — ${vendorName} for ${eventName}`;

  const issueLines = actionable.map(i =>
    `• [${i.severity.toUpperCase()}] ${i.field}: ${i.issue}\n  ${i.detail}`
  ).join('\n\n');

  const body =
`Dear ${vendorName},

Your certificate of insurance for "${eventName}" has been flagged for the following reasons:

${issueLines}

Please review the items above and resubmit a corrected certificate at your earliest convenience.

Thank you.`;

  return { subject, body };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const {
      pdfBase64,
      eventDate,
      vendorName,
      vendorEmail,
      vendorType,
      eventId,
    } = await request.json();

    if (!pdfBase64) {
      return NextResponse.json({ error: 'PDF data is required' }, { status: 400 });
    }

    // Fetch venue settings and event name in parallel
    const [settings, eventName] = await Promise.all([
      fetchVenueSettings(),
      eventId ? fetchEventName(eventId) : Promise.resolve('Unknown Event'),
    ]);

    // ------------------------------------------------------------------
    // Extract from PDF using Claude
    // ------------------------------------------------------------------
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document' as any,
              source: {
                type: 'base64',
                media_type: 'application/pdf' as any,
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `You are an expert at extracting data from ACORD 25 Certificate of Insurance forms.

Extract the following specific fields. If a field is blank or not present in the PDF, return null (the JSON null value, not the string "null").

Return ONLY a valid JSON object with exactly these keys — no extra text or explanation:

{
  "producer_name": "Name from the Producer box (top left of form)",
  "insured_name": "Name of the insured entity (the policyholder / vendor)",
  "certificate_holder": "Full text from the Certificate Holder box (bottom left), including name and full address as one string",

  "gl_insurer_letter": "The letter code (e.g. A, B) in the insurer column for the General Liability row",
  "gl_policy_number": "Policy number for the General Liability line",
  "gl_effective_date": "Effective date for GL in MM/DD/YYYY format",
  "gl_expiration_date": "Expiration date for GL in MM/DD/YYYY format",
  "gl_each_occurrence_limit": "The EACH OCCURRENCE amount for General Liability (e.g. $1,000,000)",
  "gl_general_aggregate_limit": "The GEN'L AGGREGATE amount (e.g. $2,000,000)",
  "gl_addl_insured": "true or false — is the ADDL INSD checkbox checked for General Liability?",
  "gl_subr_wvd": "true or false — is the SUBR WVD checkbox checked for General Liability?",
  "gl_occurrence_type": "OCCUR if the Occurrence checkbox is checked on the General Liability row, or CLAIMS-MADE if the Claims-Made checkbox is checked. null if neither is clearly marked.",

  "liquor_liability_limit": "Liquor Liability coverage limit if a row exists (e.g. $1,000,000), otherwise null",

  "workers_comp_statutory": "true or false — does the Workers Comp section show STATUTORY limits? null if no Workers Comp section",
  "workers_comp_limit": "E.L. EACH ACCIDENT amount from Workers Comp (e.g. $1,000,000), otherwise null",
  "wc_proprietor_excluded": "true or false — is there a notation that the sole proprietor / owner is EXCLUDED from Workers Comp coverage? null if no Workers Comp section",

  "auto_liability_limit": "Auto Liability COMBINED SINGLE LIMIT (e.g. $1,000,000), otherwise null",
  "auto_addl_insured": "true or false — is the ADDL INSD checkbox checked for the Auto Liability row? null if no Auto row",
  "auto_subr_wvd": "true or false — is the SUBR WVD checkbox checked for the Auto Liability row? null if no Auto row",
  "auto_coverage_type": "An object describing which auto coverage checkboxes are checked: { any_auto: boolean, owned: boolean, hired: boolean, non_owned: boolean }. null if no Auto Liability row exists.",

  "umbrella_liability_limit": "Umbrella / Excess Liability EACH OCCURRENCE amount (e.g. $5,000,000), otherwise null",
  "umbrella_type": "UMBRELLA if the form indicates Umbrella Liability, EXCESS if it indicates Excess Liability. null if not present.",
  "umbrella_deductible": "The deductible amount shown for Umbrella/Excess coverage (e.g. $10,000). null if no deductible or no Umbrella row.",

  "description_of_operations": "The COMPLETE text from the Description of Operations / Locations / Exclusions box. Capture every word exactly as written."
}

Important notes:
- gl_addl_insured, gl_subr_wvd, workers_comp_statutory, wc_proprietor_excluded, auto_addl_insured, and auto_subr_wvd must be JSON booleans (true / false) or null — never strings.
- auto_coverage_type must be a JSON object with boolean values { any_auto, owned, hired, non_owned }, or null if no Auto row.
- gl_occurrence_type must be the string "OCCUR" or "CLAIMS-MADE", or null.
- umbrella_type must be the string "UMBRELLA" or "EXCESS", or null.
- Currency fields should be returned as strings exactly as they appear on the form (e.g. "$1,000,000").
- If description_of_operations is empty or says "N/A", return null.`,
            },
          ],
        },
      ],
    });

    // Parse response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let responseText = content.text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    let extractedData: any;
    try {
      extractedData = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse certificate data from AI response');
    }

    // Coerce boolean fields that Claude may return as strings
    const boolFields = [
      'gl_addl_insured', 'gl_subr_wvd', 'workers_comp_statutory',
      'wc_proprietor_excluded', 'auto_addl_insured', 'auto_subr_wvd',
    ];
    for (const field of boolFields) {
      if (typeof extractedData[field] === 'string') {
        extractedData[field] = extractedData[field].toLowerCase() === 'true';
      }
    }

    // Coerce auto_coverage_type sub-booleans
    if (extractedData.auto_coverage_type && typeof extractedData.auto_coverage_type === 'object') {
      for (const key of ['any_auto', 'owned', 'hired', 'non_owned']) {
        if (typeof extractedData.auto_coverage_type[key] === 'string') {
          extractedData.auto_coverage_type[key] = extractedData.auto_coverage_type[key].toLowerCase() === 'true';
        }
      }
    }

    // ------------------------------------------------------------------
    // Confidence score (based on critical fields only)
    // ------------------------------------------------------------------
    const criticalFields = [
      'producer_name', 'insured_name', 'certificate_holder',
      'gl_policy_number', 'gl_effective_date', 'gl_expiration_date',
      'gl_each_occurrence_limit', 'gl_general_aggregate_limit',
      'gl_addl_insured', 'gl_subr_wvd', 'description_of_operations',
    ];
    const foundCount = criticalFields.filter(
      (f) => extractedData[f] !== null && extractedData[f] !== undefined && extractedData[f] !== ''
    ).length;
    const confidence = Math.round((foundCount / criticalFields.length) * 100);

    // ------------------------------------------------------------------
    // Validate
    // ------------------------------------------------------------------
    const validationIssues = validateCertificate(
      extractedData,
      eventDate || '',
      vendorType || '',
      settings
    );

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (validationIssues.some(i => i.severity === 'error')) status = 'red';
    else if (validationIssues.some(i => i.severity === 'warning')) status = 'yellow';

    // Human-readable status label
    const statusLabel = status === 'green' ? 'APPROVED' : status === 'yellow' ? 'REVIEW_NEEDED' : 'REJECTED';

    // Email payload for remediation notification
    const emailPayload = generateEmailPayload(
      vendorName || 'Vendor',
      eventName,
      validationIssues,
      status
    );

    // ------------------------------------------------------------------
    // Persist
    // ------------------------------------------------------------------
    let certificateId: string | null = null;
    let pdfUrl: string | null = null;
    let pdfUploadError: string | null = null;

    if (vendorName && vendorEmail && eventId) {
      try {
        // Find or create vendor
        let vendorId: string;
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('email', vendorEmail)
          .single();

        if (existingVendor) {
          vendorId = existingVendor.id;
        } else {
          const { data: newVendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({ name: vendorName, email: vendorEmail, type: vendorType || 'Other' })
            .select('id')
            .single();
          if (vendorError) throw vendorError;
          vendorId = newVendor!.id;
        }

        // Upload PDF
        try {
          const fileName = `${vendorId}-${eventId}-${Date.now()}.pdf`;
          const pdfBuffer = Buffer.from(pdfBase64, 'base64');

          const { error: uploadError } = await getSupabaseServer().storage
            .from('certificates')
            .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: false });

          if (uploadError) {
            pdfUploadError = JSON.stringify(uploadError);
          } else {
            const { data: urlData } = getSupabaseServer().storage
              .from('certificates')
              .getPublicUrl(fileName);
            pdfUrl = urlData.publicUrl;
          }
        } catch (uploadErr) {
          pdfUploadError = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        }

        // Parse expiration date for the DB column
        let expirationDate: string | null = null;
        const rawExp = extractedData.gl_expiration_date;
        if (rawExp) {
          try {
            const d = new Date(rawExp);
            if (!isNaN(d.getTime())) expirationDate = d.toISOString().split('T')[0];
          } catch { /* ignore */ }
        }

        // Save certificate
        const { data: certificate, error: certError } = await supabase
          .from('certificates')
          .insert({
            vendor_id: vendorId,
            status,
            confidence_score: confidence,
            extracted_data: extractedData,
            validation_issues: validationIssues,
            human_approved: false,
            pdf_url: pdfUrl,
            expiration_date: expirationDate,
          })
          .select('id')
          .single();

        if (certError) throw certError;
        certificateId = certificate!.id;

        // Link to event
        const { error: linkError } = await supabase
          .from('event_certificates')
          .insert({ event_id: eventId, certificate_id: certificateId, auto_populated: false });

        if (linkError) console.error('Failed to link certificate to event:', linkError);
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      certificateId,
      extractedData,
      validationIssues,
      confidence,
      status,
      statusLabel,
      pdfUrl,
      pdfUploadError,
      emailPayload,
    });
  } catch (error) {
    console.error('Certificate extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract certificate data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
