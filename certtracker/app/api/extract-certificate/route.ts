import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getSupabaseServer } from '@/lib/supabase-server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const {
      pdfBase64,
      eventDate,
      venueRequirements,
      vendorName,
      vendorEmail,
      vendorType,
      eventId
    } = await request.json();

    if (!pdfBase64) {
      return NextResponse.json(
        { error: 'PDF data is required' },
        { status: 400 }
      );
    }

    // Extract data from ACORD 25 form using Claude Vision
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

Please extract the following information from this certificate and return it as a valid JSON object:

{
  "insuranceCompany": "Name of the insurance company",
  "policyNumber": "Policy number",
  "effectiveDate": "Policy effective date (MM/DD/YYYY format)",
  "expirationDate": "Policy expiration date (MM/DD/YYYY format)",
  "generalLiability": "General liability coverage amount (e.g., $1,000,000)",
  "aggregateLimit": "Aggregate limit amount (e.g., $2,000,000)",
  "certificateHolder": "Name of certificate holder",
  "additionalInsured": "Whether certificate holder is listed as additional insured (Yes/No)",
  "description": "Description of operations",
  "producerName": "Insurance producer/agent name",
  "producerEmail": "Insurance producer/agent email",
  "producerPhone": "Insurance producer/agent phone",
  "insuredName": "Name of insured",
  "insuredAddress": "Address of insured"
}

Extract all visible text exactly as it appears. If a field is not present or not legible, use "Not found" as the value.

Return ONLY the JSON object, no additional text or explanation.`,
            },
          ],
        },
      ],
    });

    // Parse the extracted data
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Clean the response text - remove markdown code blocks if present
    let responseText = content.text.trim();

    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    // Parse the JSON
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse certificate data from AI response');
    }

    // Calculate confidence score based on how many fields were successfully extracted
    const totalFields = 14;
    const extractedFields = Object.values(extractedData).filter(
      (value) => value !== 'Not found' && value !== ''
    ).length;
    const confidence = Math.round((extractedFields / totalFields) * 100);

    // Validate extracted data against venue requirements
    const validationIssues = validateCertificate(
      extractedData,
      eventDate,
      venueRequirements
    );

    // Determine overall status based on validation issues
    let status: 'green' | 'yellow' | 'red' = 'green';
    const hasErrors = validationIssues.some((issue) => issue.severity === 'error');
    const hasWarnings = validationIssues.some((issue) => issue.severity === 'warning');

    if (hasErrors) {
      status = 'red';
    } else if (hasWarnings) {
      status = 'yellow';
    }

    // Save to database
    let certificateId: string | null = null;

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
            .insert({
              name: vendorName,
              email: vendorEmail,
              type: vendorType || 'Other',
            })
            .select('id')
            .single();

          if (vendorError) throw vendorError;
          vendorId = newVendor!.id;
        }

        // Upload PDF to Supabase Storage using service role key
        let pdfUrl: string | null = null;
        try {
          const fileName = `${vendorId}-${eventId}-${Date.now()}.pdf`;
          const pdfBuffer = Buffer.from(pdfBase64, 'base64');

          const { data: uploadData, error: uploadError } = await getSupabaseServer().storage
            .from('certificates')
            .upload(fileName, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: false,
            });

          if (uploadError) {
            console.error('PDF upload error:', uploadError);
            console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
          } else {
            // Get public URL
            const { data: urlData } = getSupabaseServer().storage
              .from('certificates')
              .getPublicUrl(fileName);
            pdfUrl = urlData.publicUrl;
            console.log('PDF uploaded successfully:', pdfUrl);
          }
        } catch (uploadErr) {
          console.error('Failed to upload PDF:', uploadErr);
        }

        // Extract expiration date from certificate data
        let expirationDate: string | null = null;
        if (extractedData.expirationDate && extractedData.expirationDate !== 'Not found') {
          try {
            const date = new Date(extractedData.expirationDate);
            if (!isNaN(date.getTime())) {
              expirationDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
          } catch (e) {
            console.error('Failed to parse expiration date:', e);
          }
        }

        // Save certificate (vendor-centric, not tied to event directly)
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

        // Link certificate to event
        const { error: linkError } = await supabase
          .from('event_certificates')
          .insert({
            event_id: eventId,
            certificate_id: certificateId,
            auto_populated: false,
          });

        if (linkError) {
          console.error('Failed to link certificate to event:', linkError);
        }

        console.log('Certificate saved to database:', certificateId);
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Don't fail the request if database save fails
      }
    }

    return NextResponse.json({
      success: true,
      certificateId,
      extractedData,
      validationIssues,
      confidence,
      status,
    });
  } catch (error) {
    console.error('Certificate extraction error:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract certificate data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Validation logic for certificate data
function validateCertificate(
  data: any,
  eventDate: string,
  requirements: any = {}
) {
  const issues: Array<{
    severity: 'error' | 'warning' | 'info';
    field: string;
    issue: string;
    detail: string;
  }> = [];

  // Default venue requirements (can be customized per venue)
  const defaultRequirements = {
    minGeneralLiability: 1000000, // $1M
    minAggregateLimit: 2000000, // $2M
    requireAdditionalInsured: true,
    certificateHolderName: 'Harbor View Event Center', // This should come from venue settings
    ...requirements,
  };

  // Check if key fields are missing
  if (data.insuranceCompany === 'Not found' || !data.insuranceCompany) {
    issues.push({
      severity: 'error',
      field: 'Insurance Company',
      issue: 'Insurance company name not found',
      detail: 'The certificate must clearly show the insurance company name.',
    });
  }

  if (data.policyNumber === 'Not found' || !data.policyNumber) {
    issues.push({
      severity: 'error',
      field: 'Policy Number',
      issue: 'Policy number not found',
      detail: 'A valid policy number is required for verification.',
    });
  }

  // Check expiration date
  if (data.expirationDate && data.expirationDate !== 'Not found') {
    const expirationDate = new Date(data.expirationDate);
    const eventDateObj = new Date(eventDate);
    const today = new Date();

    if (expirationDate < today) {
      issues.push({
        severity: 'error',
        field: 'Expiration Date',
        issue: 'Policy has expired',
        detail: `Policy expired on ${data.expirationDate}. A current policy is required.`,
      });
    } else if (expirationDate < eventDateObj) {
      issues.push({
        severity: 'error',
        field: 'Expiration Date',
        issue: 'Policy expires before event date',
        detail: `Event date is ${eventDate}. Policy expires ${data.expirationDate}. Policy must be valid through the event date.`,
      });
    } else {
      // Check if policy expires within 30 days after event
      const thirtyDaysAfterEvent = new Date(eventDateObj);
      thirtyDaysAfterEvent.setDate(thirtyDaysAfterEvent.getDate() + 30);

      if (expirationDate < thirtyDaysAfterEvent) {
        const daysAfterEvent = Math.ceil(
          (expirationDate.getTime() - eventDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );
        issues.push({
          severity: 'warning',
          field: 'Expiration Date',
          issue: `Policy expires ${daysAfterEvent} days after event`,
          detail: `Event date is ${eventDate}. Policy expires ${data.expirationDate}. Consider requesting coverage that extends at least 30 days beyond the event date for post-event claims.`,
        });
      }
    }
  } else {
    issues.push({
      severity: 'error',
      field: 'Expiration Date',
      issue: 'Expiration date not found',
      detail: 'The policy expiration date must be clearly visible.',
    });
  }

  // Check general liability coverage
  if (data.generalLiability && data.generalLiability !== 'Not found') {
    const coverage = parseCoverageAmount(data.generalLiability);
    if (coverage < defaultRequirements.minGeneralLiability) {
      issues.push({
        severity: 'error',
        field: 'General Liability',
        issue: 'Insufficient general liability coverage',
        detail: `Found ${formatCurrency(coverage)}. Minimum required: ${formatCurrency(
          defaultRequirements.minGeneralLiability
        )}.`,
      });
    }
  } else {
    issues.push({
      severity: 'error',
      field: 'General Liability',
      issue: 'General liability coverage not found',
      detail: 'General liability coverage amount must be clearly stated.',
    });
  }

  // Check aggregate limit
  if (data.aggregateLimit && data.aggregateLimit !== 'Not found') {
    const coverage = parseCoverageAmount(data.aggregateLimit);
    if (coverage < defaultRequirements.minAggregateLimit) {
      issues.push({
        severity: 'error',
        field: 'Aggregate Limit',
        issue: 'Insufficient aggregate limit',
        detail: `Found ${formatCurrency(coverage)}. Minimum required: ${formatCurrency(
          defaultRequirements.minAggregateLimit
        )}.`,
      });
    }
  } else {
    issues.push({
      severity: 'error',
      field: 'Aggregate Limit',
      issue: 'Aggregate limit not found',
      detail: 'Aggregate limit amount must be clearly stated.',
    });
  }

  // Check additional insured
  if (defaultRequirements.requireAdditionalInsured) {
    const additionalInsured = data.additionalInsured?.toLowerCase();
    if (
      additionalInsured === 'not found' ||
      additionalInsured === 'no' ||
      !additionalInsured
    ) {
      issues.push({
        severity: 'error',
        field: 'Additional Insured',
        issue: 'Certificate holder not listed as additional insured',
        detail: 'The certificate holder must be named as an additional insured on the policy.',
      });
    }
  }

  // Check certificate holder
  if (data.certificateHolder && data.certificateHolder !== 'Not found') {
    if (!data.certificateHolder.includes(defaultRequirements.certificateHolderName)) {
      issues.push({
        severity: 'warning',
        field: 'Certificate Holder',
        issue: 'Certificate holder name may not match venue',
        detail: `Found: "${data.certificateHolder}". Expected: "${defaultRequirements.certificateHolderName}". Please verify this is correct.`,
      });
    }
  } else {
    issues.push({
      severity: 'error',
      field: 'Certificate Holder',
      issue: 'Certificate holder not found',
      detail: 'The certificate holder (venue) must be clearly named.',
    });
  }

  // Info-level reminder if no issues found
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

// Helper function to parse coverage amounts
function parseCoverageAmount(coverage: string): number {
  // Remove currency symbols, commas, and extract number
  const cleaned = coverage.replace(/[$,]/g, '');
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
