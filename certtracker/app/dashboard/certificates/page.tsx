'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';
import TrafficLightBadge from '@/components/certificates/TrafficLightBadge';
import { supabase } from '@/lib/supabase';

type Certificate = {
  id: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    type: string;
  };
  events: {
    id: string;
    name: string;
  }[];
  status: 'green' | 'yellow' | 'red' | 'gray';
  confidence_score: number;
  human_approved: boolean;
  created_at: string;
  vendor_id: string;
  expiration_date?: string;
};

export default function AllCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchCertificates() {
      try {
        // Fetch all certificates with vendor info
        const { data: certs, error: certsError } = await supabase
          .from('certificates')
          .select(`
            *,
            vendor:vendors(*)
          `)
          .order('created_at', { ascending: false });

        if (certsError) throw certsError;

        // For each certificate, fetch associated events
        const certificatesWithEvents = await Promise.all(
          (certs || []).map(async (cert) => {
            const { data: eventCerts } = await supabase
              .from('event_certificates')
              .select('event_id')
              .eq('certificate_id', cert.id);

            const eventIds = eventCerts?.map(ec => ec.event_id) || [];

            let events: any[] = [];
            if (eventIds.length > 0) {
              const { data: eventData } = await supabase
                .from('events')
                .select('id, name')
                .in('id', eventIds);
              events = eventData || [];
            }

            return {
              ...cert,
              events,
            };
          })
        );

        setCertificates(certificatesWithEvents);
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCertificates();
  }, []);

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.events.some(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      cert.vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">All Certificates</h1>
        <p className="text-sm text-slate-600">
          View and manage all certificate submissions
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor, event, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600 mb-1">Total</p>
          <p className="text-2xl font-semibold text-slate-900">{certificates.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-700 mb-1">Approved</p>
          <p className="text-2xl font-semibold text-emerald-900">
            {certificates.filter((c) => c.human_approved).length}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700 mb-1">Needs Review</p>
          <p className="text-2xl font-semibold text-amber-900">
            {certificates.filter((c) => !c.human_approved && c.status !== 'red').length}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 mb-1">Issues Found</p>
          <p className="text-2xl font-semibold text-red-900">
            {certificates.filter((c) => c.status === 'red').length}
          </p>
        </div>
      </div>

      {/* Certificates Table */}
      {filteredCertificates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm ? 'No certificates found' : 'No certificates yet'}
          </h3>
          <p className="text-sm text-slate-600">
            {searchTerm
              ? 'Try a different search term'
              : 'Certificates will appear here when vendors upload them'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{cert.vendor.name}</p>
                      <p className="text-xs text-slate-500">{cert.vendor.type}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {cert.events.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cert.events.map((event, idx) => (
                          <span key={event.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            {event.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Not linked to events</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <TrafficLightBadge
                      status={cert.status}
                      humanApproved={cert.human_approved}
                    />
                  </td>
                  <td className="px-6 py-4">
                    {cert.expiration_date ? (
                      <p className="text-sm text-slate-900">
                        {new Date(cert.expiration_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">-</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 w-20">
                        <div
                          className={`h-full rounded-full ${
                            cert.confidence_score >= 90
                              ? 'bg-emerald-500'
                              : cert.confidence_score >= 75
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${cert.confidence_score}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600">{cert.confidence_score}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">
                      {new Date(cert.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/certificates/${cert.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
