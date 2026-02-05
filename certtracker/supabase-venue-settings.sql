-- Create venue_settings table (single-row config for the venue)
CREATE TABLE IF NOT EXISTS venue_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  venue_name TEXT DEFAULT '',
  venue_address TEXT DEFAULT '',
  min_gl_limit NUMERIC DEFAULT 1000000,
  min_aggregate_limit NUMERIC DEFAULT 2000000,
  max_deductible NUMERIC DEFAULT 5000,
  required_ai_text TEXT DEFAULT '',
  require_subr_wvd BOOLEAN DEFAULT false,
  require_liquor BOOLEAN DEFAULT false,
  min_liquor_limit NUMERIC DEFAULT 1000000,
  strict_workers_comp BOOLEAN DEFAULT false,
  expiration_buffer_days INTEGER DEFAULT 0,
  validation_mode TEXT DEFAULT 'warning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row if it doesn't exist
INSERT INTO venue_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE venue_settings ENABLE ROW LEVEL SECURITY;

-- Allow all access (same pattern as other tables)
DROP POLICY IF EXISTS "Allow all access to venue_settings" ON venue_settings;
CREATE POLICY "Allow all access to venue_settings"
ON venue_settings
FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- v2 columns — safe to run against an existing table (IF NOT EXISTS)
-- ---------------------------------------------------------------------------
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS min_auto_limit            NUMERIC  DEFAULT 1000000;
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS min_umbrella_limit        NUMERIC  DEFAULT 0;
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS allow_claims_made         BOOLEAN  DEFAULT false;
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS require_primary_non_contributory BOOLEAN DEFAULT true;
ALTER TABLE venue_settings ADD COLUMN IF NOT EXISTS enforce_auto_owned        BOOLEAN  DEFAULT true;
