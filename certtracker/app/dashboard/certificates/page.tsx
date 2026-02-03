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
  event: {
    id: string;
    name: string;
  };
  status: 'green' | 'yellow' | 'red' | 'gray';
  confidence_score: number;
  human_approved: boolean;
  created_at: string;
  version: number;
  is_latest: boolean;
  vendor_id: string;
  event_id: string;
};

export default function AllCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [versionHistory, setVersionHistory] = useState<Certificate[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchCertificates() {
      try {
        const { data, error } = await supabase
          .from('certificates')
          .select(`
            *,
            vendor:vendors(*),
            event:events(*)
          `)
          .eq('is_latest', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setCertificates(data || []);
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCertificates();
  }, []);

  const fetchVersionHistory = async (cert: Certificate) => {
    setSelectedCertificate(cert);
    setLoadingHistory(true);
    setShowVersionHistory(true);

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          vendor:vendors(*),
          event:events(*)
        `)
        .eq('vendor_id', cert.vendor_id)
        .eq('event_id', cert.event_id)
        .order('version', { ascending: false });

      if (error) throw error;

      setVersionHistory(data || []);
    } catch (error) {
      console.error('Error fetching version history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Version
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
                    <p className="text-sm text-slate-900">{cert.event.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <TrafficLightBadge
                      status={cert.status}
                      humanApproved={cert.human_approved}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">v{cert.version}</span>
                      {cert.is_latest && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Latest</span>
                      )}
                    </div>
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
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/certificates/${cert.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Review
                      </Link>
                      <button
                        onClick={() => fetchVersionHistory(cert)}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Certificate Version History</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedCertificate.vendor.name} • {selectedCertificate.event.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-slate-600">Loading version history...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {versionHistory.map((version) => (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 ${
                        version.is_latest
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-slate-900">Version {version.version}</span>
                            {version.is_latest && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <TrafficLightBadge
                            status={version.status}
                            humanApproved={version.human_approved}
                          />
                        </div>
                        <Link
                          href={`/dashboard/certificates/${version.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          View Details
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Uploaded</p>
                          <p className="text-slate-900 font-medium">
                            {new Date(version.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Confidence</p>
                          <p className="text-slate-900 font-medium">{version.confidence_score}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Approval Status</p>
                          <p className="text-slate-900 font-medium">
                            {version.human_approved ? 'Approved' : 'Pending'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Status</p>
                          <p className="text-slate-900 font-medium capitalize">{version.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowVersionHistory(false)}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
