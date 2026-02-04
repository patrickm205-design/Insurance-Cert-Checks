import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

// Lazy initialization - only creates client when first used at runtime
export function getSupabaseServer() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error('Missing Supabase server environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return client;
}
