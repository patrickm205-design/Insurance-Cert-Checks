'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User2, MapPin, Send, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Event = {
  id: string;
  name: string;
  type: string;
  date: string;
  client: string;
  venue: string;
};

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [copied, setCopied] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    approved: 0,
    needsReview: 0,
    issues: 0,
    notUploaded: 0,
  });

  useEffect(() => {
    async function fetchEvent() {
      try {
        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError || !eventData) {
          console.error('Event not found:', eventError);
          setLoading(false);
          return;
        }

        setEvent(eventData);

        // Fetch certificates for this event
        const { data: eventCerts } = await supabase
          .from('event_certificates')
          .select('certificate_id')
          .eq('event_id', id);

        const certificateIds = eventCerts?.map(ec => ec.certificate_id) || [];

        if (certificateIds.length > 0) {
          const { data: certs } = await supabase
            .from('certificates')
            .select('status, human_approved')
            .in('id', certificateIds);

          const approved = certs?.filter((c) => c.human_approved).length || 0;
          const issues = certs?.filter((c) => c.status === 'red' && !c.human_approved).length || 0;
          const needsReview = certs?.filter((c) => !c.human_approved && c.status !== 'red').length || 0;

          setStats({
            approved,
            needsReview,
            issues,
            notUploaded: 0,
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching event:', error);
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  const copyUploadLink = () => {
    const uploadUrl = `${window.location.origin}/upload/${id}`;
    navigator.clipboard.writeText(uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-slate-700">Event not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Event Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">{event.name}</h1>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
              {event.type}
            </span>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
            <Send className="w-4 h-4" />
            Request All COIs
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Event Date</p>
              <p className="text-sm font-medium text-slate-900">{event.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <User2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Client</p>
              <p className="text-sm font-medium text-slate-900">{event.client}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Venue</p>
              <p className="text-sm font-medium text-slate-900">{event.venue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.approved}</p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.needsReview}</p>
              <p className="text-sm text-slate-500">Needs Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.issues}</p>
              <p className="text-sm text-slate-500">Issues Found</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats.notUploaded}</p>
              <p className="text-sm text-slate-500">Not Uploaded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Link */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-indigo-900 mb-1">Vendor Upload Link</h3>
            <p className="text-sm text-indigo-700 mb-3">
              Share this link with vendors so they can upload their certificates directly.
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white border border-indigo-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 font-mono">
                {typeof window !== 'undefined' ? `${window.location.origin}/upload/${id}` : '/upload/...'}
              </code>
              <button
                onClick={copyUploadLink}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 flex-shrink-0"
              >
                <LinkIcon className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Vendor Certificates</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-600 mb-4">Upload certificates using the link above, then view them in "All Certificates"</p>
          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View All Certificates
          </Link>
        </div>
      </div>
    </div>
  );
}
