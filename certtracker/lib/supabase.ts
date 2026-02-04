import { createClient } from '@supabase/supabase-js';

// Placeholders prevent a module-eval-time throw during `next build` page-data
// collection.  Real env vars are always present at request time in production.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export type Vendor = {
  id: string;
  name: string;
  email: string;
  type: string;
  created_at: string;
  updated_at: string;
};

export type Certificate = {
  id: string;
  vendor_id: string;
  event_id: string;
  status: 'green' | 'yellow' | 'red' | 'gray';
  human_approved: boolean;
  confidence_score: number;
  pdf_url: string | null;
  extracted_data: Record<string, any>;
  validation_issues: Array<{
    severity: 'error' | 'warning' | 'info';
    field: string;
    issue: string;
    detail: string;
  }>;
  approved_by: string | null;
  approved_at: string | null;
  rejection_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  name: string;
  type: string;
  date: string;
  client: string;
  venue: string;
  venue_requirements: Record<string, any>;
  created_at: string;
  updated_at: string;
};
