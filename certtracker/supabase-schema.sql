-- CertTracker Database Schema
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  client TEXT NOT NULL,
  venue TEXT NOT NULL,
  venue_requirements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red', 'gray')),
  human_approved BOOLEAN DEFAULT FALSE,
  confidence_score INTEGER DEFAULT 0,
  pdf_url TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  validation_issues JSONB DEFAULT '[]'::jsonb,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id, event_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_certificates_vendor_id ON certificates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_certificates_updated_at ON certificates;
CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample event data (Johnson-Smith Wedding)
INSERT INTO events (id, name, type, date, client, venue, venue_requirements)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Johnson-Smith Wedding',
  'Wedding',
  'Apr 15, 2025',
  'Emily Johnson & Michael Smith',
  'Grand Ballroom at The Plaza',
  '{"minGeneralLiability": 1000000, "minAggregateLimit": 2000000, "requireAdditionalInsured": true, "certificateHolderName": "Grand Ballroom at The Plaza"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) - Optional, but recommended
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for now (you can restrict this later)
DROP POLICY IF EXISTS "Allow public read access to vendors" ON vendors;
CREATE POLICY "Allow public read access to vendors"
  ON vendors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert to vendors" ON vendors;
CREATE POLICY "Allow public insert to vendors"
  ON vendors FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to events" ON events;
CREATE POLICY "Allow public read access to events"
  ON events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to certificates" ON certificates;
CREATE POLICY "Allow public read access to certificates"
  ON certificates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert to certificates" ON certificates;
CREATE POLICY "Allow public insert to certificates"
  ON certificates FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to certificates" ON certificates;
CREATE POLICY "Allow public update to certificates"
  ON certificates FOR UPDATE
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables created: vendors, events, certificates';
  RAISE NOTICE 'Sample event inserted: Johnson-Smith Wedding';
END $$;
