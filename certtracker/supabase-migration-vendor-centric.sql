-- Migration: Refactor to vendor-centric certificate model
-- This allows certificates to be reused across multiple events
-- Run this AFTER the versions migration

-- Step 1: Add expiration_date to certificates
-- This allows us to check if a certificate is still valid
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- Step 2: Create event_certificates junction table
-- This links certificates to events
CREATE TABLE IF NOT EXISTS event_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT,
  auto_populated BOOLEAN DEFAULT false,
  UNIQUE(event_id, certificate_id)
);

-- Step 3: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_event_certificates_event
ON event_certificates(event_id);

CREATE INDEX IF NOT EXISTS idx_event_certificates_certificate
ON event_certificates(certificate_id);

-- Step 4: Add RLS policies for event_certificates
ALTER TABLE event_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to event_certificates"
ON event_certificates
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to event_certificates"
ON event_certificates
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update access to event_certificates"
ON event_certificates
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Allow public delete access to event_certificates"
ON event_certificates
FOR DELETE
TO public
USING (true);

-- Step 5: Migrate existing data IF event_id column exists
-- Find all existing certificates and create event_certificate links
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'certificates'
    AND column_name = 'event_id'
  ) THEN
    INSERT INTO event_certificates (event_id, certificate_id, auto_populated)
    SELECT
      event_id,
      id,
      false
    FROM certificates
    WHERE event_id IS NOT NULL
    ON CONFLICT (event_id, certificate_id) DO NOTHING;

    RAISE NOTICE 'Migrated existing certificate-event relationships';
  END IF;
END $$;

-- Step 6: Remove event_id from certificates table (now using junction table)
ALTER TABLE certificates
DROP COLUMN IF EXISTS event_id;

-- Step 7: Remove version and superseded columns (no longer tied to events)
ALTER TABLE certificates
DROP COLUMN IF EXISTS version CASCADE,
DROP COLUMN IF EXISTS is_latest CASCADE,
DROP COLUMN IF EXISTS superseded_at CASCADE,
DROP COLUMN IF EXISTS superseded_by CASCADE;

-- Step 8: Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_new_certificate_version ON certificates;
DROP FUNCTION IF EXISTS handle_new_certificate_version();

-- Step 9: Create function to auto-populate certificates for returning vendors
CREATE OR REPLACE FUNCTION auto_populate_vendor_certificates(
  p_vendor_id UUID,
  p_event_id UUID
)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- Find all valid certificates for this vendor
  -- Valid = not expired, human approved, and status is green or yellow
  INSERT INTO event_certificates (event_id, certificate_id, auto_populated, added_by)
  SELECT
    p_event_id,
    c.id,
    true,
    'System Auto-Population'
  FROM certificates c
  WHERE
    c.vendor_id = p_vendor_id
    AND c.human_approved = true
    AND c.status IN ('green', 'yellow')
    AND (c.expiration_date IS NULL OR c.expiration_date > CURRENT_DATE)
  ON CONFLICT (event_id, certificate_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Certificates are now vendor-centric and can be reused across events';
  RAISE NOTICE 'Use auto_populate_vendor_certificates(vendor_id, event_id) to auto-link certificates';
END $$;
