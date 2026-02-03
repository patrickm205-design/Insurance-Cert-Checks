import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch certificate with vendor details
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('id', id)
      .single();

    if (certError || !certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Fetch associated events through junction table
    const { data: eventCerts } = await supabase
      .from('event_certificates')
      .select('event_id')
      .eq('certificate_id', id);

    const eventIds = eventCerts?.map(ec => ec.event_id) || [];

    let events: any[] = [];
    if (eventIds.length > 0) {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name')
        .in('id', eventIds);
      events = eventData || [];
    }

    // Return certificate with events array (for compatibility, use first event as primary)
    return NextResponse.json({
      ...certificate,
      events,
      event: events.length > 0 ? events[0] : null,
    });
  } catch (error) {
    console.error('Failed to fetch certificate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}

// Update certificate status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { human_approved, rejection_notes, approved_by } = body;

    const updateData: any = {
      human_approved,
      updated_at: new Date().toISOString(),
    };

    if (human_approved) {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = approved_by || 'Venue Manager';
      updateData.rejection_notes = null;
    } else {
      updateData.rejection_notes = rejection_notes;
      updateData.approved_at = null;
      updateData.approved_by = null;
    }

    const { data, error } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update certificate' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update certificate:', error);
    return NextResponse.json(
      { error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
}
