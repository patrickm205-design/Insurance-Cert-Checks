-- Migration: Add support for multiple certificate versions
-- Run this in Supabase SQL Editor to update the schema

-- Step 1: Remove the UNIQUE constraint on (vendor_id, event_id)
-- This allows multiple certificates from the same vendor for the same event
ALTER TABLE certificates
DROP CONSTRAINT IF EXISTS certificates_vendor_id_event_id_key;

-- Step 2: Add version tracking columns
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES certificates(id);

-- Step 3: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_certificates_vendor_event_latest
ON certificates(vendor_id, event_id, is_latest)
WHERE is_latest = true;

-- Step 4: Create a function to handle new certificate uploads
-- This function will mark old versions as not latest when a new version is uploaded
CREATE OR REPLACE FUNCTION handle_new_certificate_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous certificates for this vendor/event as not latest
  UPDATE certificates
  SET
    is_latest = false,
    superseded_at = NOW(),
    superseded_by = NEW.id
  WHERE
    vendor_id = NEW.vendor_id
    AND event_id = NEW.event_id
    AND id != NEW.id
    AND is_latest = true;

  -- Set version number for new certificate
  NEW.version := COALESCE(
    (SELECT MAX(version) + 1
     FROM certificates
     WHERE vendor_id = NEW.vendor_id AND event_id = NEW.event_id),
    1
  );

  NEW.is_latest := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically handle versions
DROP TRIGGER IF EXISTS trigger_new_certificate_version ON certificates;
CREATE TRIGGER trigger_new_certificate_version
  BEFORE INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_certificate_version();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Certificates table now supports multiple versions per vendor/event';
  RAISE NOTICE 'New certificates will automatically be marked as latest version';
END $$;
