import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULTS = {
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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('venue_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      return NextResponse.json(DEFAULTS);
    }

    return NextResponse.json(data);
  } catch (error) {
    // Table might not exist yet — return defaults
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { error } = await supabase
      .from('venue_settings')
      .upsert({
        id: 'default',
        venue_name: body.venue_name ?? '',
        venue_address: body.venue_address ?? '',
        min_gl_limit: Number(body.min_gl_limit) || 1000000,
        min_aggregate_limit: Number(body.min_aggregate_limit) || 2000000,
        max_deductible: Number(body.max_deductible) || 5000,
        required_ai_text: body.required_ai_text ?? '',
        require_subr_wvd: Boolean(body.require_subr_wvd),
        require_liquor: Boolean(body.require_liquor),
        min_liquor_limit: Number(body.min_liquor_limit) || 1000000,
        strict_workers_comp: Boolean(body.strict_workers_comp),
        enforce_auto_owned: body.enforce_auto_owned === undefined ? true : Boolean(body.enforce_auto_owned),
        min_auto_limit: Number(body.min_auto_limit) || 1000000,
        min_umbrella_limit: Number(body.min_umbrella_limit) || 0,
        allow_claims_made: Boolean(body.allow_claims_made),
        require_primary_non_contributory: body.require_primary_non_contributory === undefined ? true : Boolean(body.require_primary_non_contributory),
        expiration_buffer_days: Number(body.expiration_buffer_days) || 0,
        validation_mode: body.validation_mode === 'strict' ? 'strict' : 'warning',
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update venue settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
