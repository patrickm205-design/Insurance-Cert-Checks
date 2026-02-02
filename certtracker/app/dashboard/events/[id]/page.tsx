'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User2, MapPin, Send, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import VendorTable from '@/components/VendorTable';

// Mock data for the Johnson-Smith Wedding
const eventData = {
  '1': {
    id: '1',
    name: 'Johnson-Smith Wedding',
    type: 'Wedding',
    date: 'Apr 15, 2025',
    client: 'Emily Johnson & Michael Smith',
    venue: 'Grand Ballroom at The Plaza',
    vendors: [
      {
        id: 'v1',
        name: 'Apex Catering',
        email: 'contact@apexcatering.com',
        type: 'Caterer',
        status: 'green' as const,
        humanApproved: true,
        policyExpires: 'Mar 15, 2026',
        coverage: '$2M',
      },
      {
        id: 'v2',
        name: 'Summit AV Productions',
        email: 'bookings@summitav.com',
        type: 'AV Company',
        status: 'yellow' as const,
        policyExpires: 'May 1, 2025',
        coverage: '$1M',
        issues: [
          'Policy expires 16 days after event',
          'Additional Insured unclear (68% confidence)',
        ],
      },
      {
        id: 'v3',
        name: 'Bella Flora Design',
        email: 'info@bellafloradesign.com',
        type: 'Florist',
        status: 'green' as const,
        humanApproved: true,
        policyExpires: 'Jan 20, 2026',
        coverage: '$1M',
      },
      {
        id: 'v4',
        name: 'Harmonic Entertainment',
        email: 'dj@harmonicent.com',
        type: 'DJ',
        status: 'red' as const,
        policyExpires: 'Dec 31, 2025',
        coverage: '$500K',
        issues: [
          'GL below $1M requirement',
          'No Liquor Liability',
          'Wrong Certificate Holder',
        ],
      },
      {
        id: 'v5',
        name: 'Prestige Photography',
        email: 'studio@prestigephoto.com',
        type: 'Photographer',
        status: 'green' as const,
        humanApproved: true,
        policyExpires: 'Jun 30, 2026',
        coverage: '$2M',
      },
      {
        id: 'v6',
        name: 'Artisan Cake Studio',
        email: 'orders@artisancakes.com',
        type: 'Baker',
        status: 'gray' as const,
      },
    ],
  },
};

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [copied, setCopied] = useState(false);
  const event = eventData[id as keyof typeof eventData];

  const copyUploadLink = () => {
    const uploadUrl = `${window.location.origin}/upload/${id}`;
    navigator.clipboard.writeText(uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!event) {
    return (
      <div className="p-8">
        <p className="text-slate-700">Event not found</p>
      </div>
    );
  }

  const approved = event.vendors.filter((v) => v.status === 'green' && v.humanApproved).length;
  const needsReview = event.vendors.filter((v) => v.status === 'yellow' || (v.status === 'green' && !v.humanApproved)).length;
  const issues = event.vendors.filter((v) => v.status === 'red').length;
  const notUploaded = event.vendors.filter((v) => v.status === 'gray').length;

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
              <p className="text-2xl font-semibold text-slate-900">{approved}</p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{needsReview}</p>
              <p className="text-sm text-slate-500">Needs Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{issues}</p>
              <p className="text-sm text-slate-500">Issues Found</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <div>
              <p className="text-2xl font-semibold text-slate-900">{notUploaded}</p>
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
        <VendorTable vendors={event.vendors} eventId={id} />
      </div>
    </div>
  );
}
