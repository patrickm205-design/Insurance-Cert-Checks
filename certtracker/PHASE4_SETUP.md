# Phase 4: Claude Vision Integration - Setup Guide

## Overview

Phase 4 is now complete! The application now uses Anthropic's Claude API to automatically extract and validate data from ACORD 25 Certificate of Insurance PDFs.

## What's New

### 1. AI-Powered Certificate Extraction
- Vendors upload PDF certificates through the upload portal
- Claude Vision API automatically extracts all key fields from ACORD 25 forms
- Real-time validation against venue requirements
- Confidence scoring based on extraction completeness

### 2. Intelligent Validation System
- **Error Detection**: Missing required fields, expired policies, insufficient coverage
- **Warning System**: Policies expiring soon, coverage close to minimums
- **Smart Recommendations**: Suggests improvements for partial compliance

### 3. Traffic Light Status
- **Green**: All checks passed, ready for human approval
- **Yellow**: Warnings found, needs review
- **Red**: Critical issues found, requires vendor action
- **Gray**: Not yet uploaded

## Getting Started

### Step 1: Get Your Anthropic API Key

1. Go to [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Sign in or create a free account
3. Click "Create Key"
4. Copy the API key (starts with `sk-ant-api...`)

**Pricing**: Pay-as-you-go, approximately:
- Claude Sonnet 4: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- ACORD 25 extraction: ~$0.02-0.05 per certificate (estimated)

### Step 2: Configure API Key

Open `/certtracker/.env.local` and replace `your_api_key_here` with your actual API key:

```bash
ANTHROPIC_API_KEY=sk-ant-api-your-actual-key-here
```

**IMPORTANT**: Never commit `.env.local` to GitHub. It's already in `.gitignore`.

### Step 3: Restart Development Server

If your dev server is running, restart it to load the new environment variable:

```bash
# Stop the server (Ctrl+C)
# Then restart
cd certtracker
npm run dev
```

### Step 4: Test the Integration

#### Option A: Upload a Real ACORD 25 Certificate

1. Navigate to `http://localhost:3000/dashboard/events/1` (Johnson-Smith Wedding)
2. Click "Copy Upload Link"
3. Paste the link in a new tab (simulating a vendor)
4. Fill in vendor information:
   - Company Name: Test Vendor Inc.
   - Email: test@vendor.com
   - Vendor Type: Caterer
5. Upload an ACORD 25 PDF certificate
6. Watch the AI extraction process:
   - "Uploading certificate..." (0-30%)
   - "Extracting data with AI..." (30-70%)
   - "Validating certificate..." (70-90%)
   - "Finalizing..." (90-100%)

**Note**: If you don't have a real ACORD 25 certificate, you can:
- Google "ACORD 25 sample PDF" to find examples
- Use the mock data (extraction won't run, but UI will work)

#### Option B: Test Without a Real Certificate

The upload page and certificate review page still work with mock data if you want to test the UI flow without using API credits.

## What Happens During Upload

1. **File Upload**: PDF is converted to base64 and sent to API
2. **AI Extraction**: Claude Vision reads the PDF and extracts:
   - Insurance company name
   - Policy number and dates
   - Coverage amounts (General Liability, Aggregate Limit)
   - Certificate holder information
   - Additional insured status
   - Producer/agent contact info

3. **Validation**: The system checks:
   - ✅ Policy not expired
   - ✅ Policy valid through event date
   - ✅ Minimum coverage requirements met ($1M general liability, $2M aggregate)
   - ✅ Certificate holder correctly named
   - ✅ Additional insured status confirmed

4. **Confidence Score**: Based on how many fields were successfully extracted

5. **Status Assignment**:
   - 🔴 **Red**: Critical errors (expired, insufficient coverage, missing fields)
   - 🟡 **Yellow**: Warnings (expiring soon, minor issues)
   - 🟢 **Green**: All checks passed

## API Endpoint

### POST `/api/extract-certificate`

**Request Body**:
```json
{
  "pdfBase64": "base64_encoded_pdf_data",
  "eventDate": "Apr 15, 2025",
  "vendorName": "Test Vendor Inc.",
  "vendorEmail": "test@vendor.com",
  "vendorType": "Caterer",
  "eventId": "1",
  "venueRequirements": {
    "minGeneralLiability": 1000000,
    "minAggregateLimit": 2000000,
    "requireAdditionalInsured": true,
    "certificateHolderName": "Harbor View Event Center"
  }
}
```

**Response**:
```json
{
  "success": true,
  "extractedData": {
    "insuranceCompany": "ABC Insurance Co.",
    "policyNumber": "POL-123456",
    "effectiveDate": "01/01/2025",
    "expirationDate": "01/01/2026",
    "generalLiability": "$1,000,000",
    "aggregateLimit": "$2,000,000",
    "certificateHolder": "Harbor View Event Center",
    "additionalInsured": "Yes",
    // ... more fields
  },
  "validationIssues": [
    {
      "severity": "warning",
      "field": "Expiration Date",
      "issue": "Policy expires 16 days after event",
      "detail": "Consider requesting coverage extending 30 days beyond event..."
    }
  ],
  "confidence": 87,
  "status": "yellow"
}
```

## Validation Rules

The system automatically validates:

| Check | Requirement | Severity if Failed |
|-------|-------------|-------------------|
| Policy Expired | Must be current | 🔴 Error |
| Expiration Before Event | Must cover event date | 🔴 Error |
| Expiration < 30 Days After | Should extend 30+ days | 🟡 Warning |
| General Liability | Minimum $1,000,000 | 🔴 Error |
| Aggregate Limit | Minimum $2,000,000 | 🔴 Error |
| Additional Insured | Must be "Yes" | 🔴 Error |
| Certificate Holder | Must match venue name | 🟡 Warning |
| Missing Fields | All fields visible | 🔴 Error |

## Customizing Requirements

To change validation rules for different venues, edit the `defaultRequirements` in `/certtracker/app/api/extract-certificate/route.ts`:

```typescript
const defaultRequirements = {
  minGeneralLiability: 1000000,    // Change to 2000000 for $2M minimum
  minAggregateLimit: 2000000,      // Change to 5000000 for $5M minimum
  requireAdditionalInsured: true,  // Set to false if not required
  certificateHolderName: 'Harbor View Event Center', // Your venue name
  ...requirements,
};
```

**Phase 6 Note**: In Phase 6, each venue will have custom requirements stored in the database.

## Next Steps

### Current Limitation
Right now, the extraction happens during upload, but the results aren't persisted anywhere because we don't have a database yet. The upload works and shows success, but the certificate review page still uses mock data.

### Phase 6: Backend Integration (Coming Next)
To complete the workflow, we need:
- **Supabase Database**: Store extracted certificate data
- **File Storage**: Save uploaded PDFs
- **Certificate Review Page**: Fetch real data from database instead of mock data
- **Vendor Management**: Link certificates to vendors across multiple events
- **Status Updates**: Update certificate status when venue manager approves/rejects

## Troubleshooting

### "Missing API key" error
- Make sure `.env.local` exists in `/certtracker` directory
- Verify the key starts with `sk-ant-api`
- Restart the development server after adding the key

### "Failed to extract certificate data" error
- Check that the PDF is actually an ACORD 25 form
- Ensure the PDF is under 10MB
- Check the browser console for detailed error messages
- Verify your API key has sufficient credits

### Upload succeeds but no data shown in review page
- This is expected! Phase 6 will add database persistence
- For now, extraction happens but results aren't stored anywhere
- The certificate review page uses mock data until Phase 6

### API quota/rate limit errors
- Claude API has rate limits for free tier
- Upgrade to paid tier at [https://console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)
- Each certificate extraction uses ~5-10K tokens

## Files Modified in Phase 4

- ✅ `/certtracker/.env.local` - API key configuration
- ✅ `/certtracker/.env.example` - Example configuration
- ✅ `/certtracker/app/api/extract-certificate/route.ts` - AI extraction endpoint
- ✅ `/certtracker/app/upload/[eventId]/page.tsx` - Upload page with API integration
- ✅ `/certtracker/package.json` - Added @anthropic-ai/sdk dependency

## Cost Estimation

Assuming Claude Sonnet 4 pricing (~$3/M input, ~$15/M output):

| Volume | Estimated Monthly Cost |
|--------|----------------------|
| 10 certificates/month | ~$0.50 |
| 100 certificates/month | ~$5 |
| 1,000 certificates/month | ~$50 |
| 10,000 certificates/month | ~$500 |

**Actual costs may vary** based on PDF complexity and field count.

## Support

For questions about:
- **Anthropic API**: [https://docs.anthropic.com/](https://docs.anthropic.com/)
- **ACORD Forms**: [https://www.acord.org/](https://www.acord.org/)
- **This Project**: Check README.md or create an issue

---

**Phase 4 Status**: ✅ Complete
**Next Phase**: Phase 5 (Auto-Chaser System) or Phase 6 (Backend Integration)
**Recommended**: Do Phase 6 next to enable data persistence
