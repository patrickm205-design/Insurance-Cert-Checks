'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, FileText, Calendar, Building2, DollarSign, Shield, MessageSquare, Mail } from 'lucide-react';
import Link from 'next/link';
import TrafficLightBadge from '@/components/certificates/TrafficLightBadge';
import { useAuth } from '@/lib/auth-context';

type Certificate = {
  id: string;
  vendor: {
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
  };
  status: 'green' | 'yellow' | 'red' | 'gray';
  extracted_data: Record<string, any>;
  validation_issues: Array<{
    severity: 'error' | 'warning' | 'info';
    field: string;
    issue: string;
    detail: string;
  }>;
  confidence_score: number;
  human_approved: boolean;
  created_at: string;
  pdf_url: string | null;
};


export default function CertificateReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch certificate from API
  useEffect(() => {
    async function fetchCertificate() {
      try {
        const response = await fetch(`/api/certificates/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch certificate');
        }
        const data = await response.json();
        setCertificate(data);
      } catch (error) {
        console.error('Error fetching certificate:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCertificate();
  }, [id]);

  const handleApprove = async () => {
    if (!certificate || !user) return;

    const approverName = user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User';

    setSubmitting(true);
    try {
      const response = await fetch(`/api/certificates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_approved: true,
          approved_by: approverName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve certificate');
      }

      alert(`Certificate approved for ${certificate.vendor.name}`);
      router.push(`/dashboard/certificates`);
    } catch (error) {
      console.error('Error approving certificate:', error);
      alert('Failed to approve certificate. Please try again.');
    } finally {
      setSubmitting(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async () => {
    if (!certificate) return;

    if (!notes.trim()) {
      alert('Please add notes explaining why this certificate is being rejected');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/certificates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_approved: false,
          rejection_notes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject certificate');
      }

      alert(`Certificate rejected. Vendor will be notified: "${notes}"`);
      router.push(`/dashboard/certificates`);
    } catch (error) {
      console.error('Error rejecting certificate:', error);
      alert('Failed to reject certificate. Please try again.');
    } finally {
      setSubmitting(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="p-8">
        <p className="text-slate-700">Certificate not found</p>
      </div>
    );
  };

  const errorCount = certificate.validation_issues.filter(i => i.severity === 'error').length;
  const warningCount = certificate.validation_issues.filter(i => i.severity === 'warning').length;

  return (
    <div className="p-8">
      {/* Header */}
      <Link
        href={`/dashboard/events/${certificate.event.id}`}
        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Event
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Certificate Review</h1>
          <p className="text-sm text-slate-600">
            <strong>{certificate.vendor.name}</strong> • {certificate.event.name}
          </p>
          <p className="text-sm text-slate-500">
            Uploaded {new Date(certificate.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <TrafficLightBadge status={certificate.status} />
      </div>

      {/* AI Confidence Score */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">AI Extraction Confidence</p>
              <p className="text-xs text-slate-500">Automated analysis of certificate fields</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-slate-900">{certificate.confidence_score}%</p>
            <p className="text-xs text-slate-500">
              {certificate.confidence_score >= 90 ? 'High' : certificate.confidence_score >= 75 ? 'Medium' : 'Low'} Confidence
            </p>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {certificate.validation_issues.length > 0 && (
        <div className={`border rounded-xl p-6 mb-6 ${
          errorCount > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              errorCount > 0 ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div className="flex-1">
              <h3 className={`text-sm font-semibold mb-1 ${
                errorCount > 0 ? 'text-red-900' : 'text-amber-900'
              }`}>
                {errorCount > 0 ? 'Issues Found - Action Required' : 'Warnings - Review Recommended'}
              </h3>
              <p className={`text-sm ${
                errorCount > 0 ? 'text-red-700' : 'text-amber-700'
              }`}>
                {errorCount > 0 && `${errorCount} critical ${errorCount === 1 ? 'issue' : 'issues'}`}
                {errorCount > 0 && warningCount > 0 && ' and '}
                {warningCount > 0 && `${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'}`}
                {' '}detected. Review details below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full-width PDF Viewer */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        {certificate.pdf_url ? (
          <iframe
            src={certificate.pdf_url}
            className="w-full"
            style={{ height: 'calc(100vh - 200px)' }}
            title="Certificate PDF"
          />
        ) : (
          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center" style={{ height: '400px' }}>
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-700 mb-2">PDF Not Available</p>
              <p className="text-xs text-slate-500">Certificate document was not stored</p>
            </div>
          </div>
        )}
      </div>

      {/* Details below PDF */}
      <div className="space-y-6">
        {/* Extracted Data */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Extracted Certificate Data</h2>

          {'gl_policy_number' in certificate.extracted_data ? (
            /* New ACORD 25 schema */
            <div className="space-y-6">
              {/* Identity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Identity</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Producer Name</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.producer_name || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Insured Name</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.insured_name || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Certificate Holder</label>
                    <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{certificate.extracted_data.certificate_holder || '—'}</p>
                  </div>
                </div>

                {/* Identity Audit — side-by-side comparison */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Identity Audit</label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Vendor (DB Record)</p>
                      <p className="text-sm font-medium text-slate-900">{certificate.vendor.name}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {(certificate.extracted_data.insured_name &&
                        (certificate.vendor.name.toLowerCase().includes(certificate.extracted_data.insured_name.toLowerCase()) ||
                         certificate.extracted_data.insured_name.toLowerCase().includes(certificate.vendor.name.toLowerCase()))) ? (
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">Insured (Extracted)</p>
                      <p className="text-sm font-medium text-slate-900">{certificate.extracted_data.insured_name || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Liability */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">General Liability</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Insurer Letter</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.gl_insurer_letter || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Policy Number</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.gl_policy_number || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Effective Date</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.gl_effective_date || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expiration Date</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.gl_expiration_date || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Each Occurrence</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.gl_each_occurrence_limit || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">General Aggregate</label>
                    <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.gl_general_aggregate_limit || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Addl Insured</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      {certificate.extracted_data.gl_addl_insured ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-slate-900">{certificate.extracted_data.gl_addl_insured ? 'Checked' : 'Not Checked'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subrogation Waiver</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      {certificate.extracted_data.gl_subr_wvd ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-slate-900">{certificate.extracted_data.gl_subr_wvd ? 'Checked' : 'Not Checked'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Policy Type</label>
                    <div className="mt-1">
                      {certificate.extracted_data.gl_occurrence_type === 'OCCUR' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Occurrence</span>
                      ) : certificate.extracted_data.gl_occurrence_type === 'CLAIMS-MADE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Claims-Made</span>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialized Coverages — always visible */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Specialized Coverages</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Automobile Liability */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Automobile Liability</label>
                    {certificate.extracted_data.auto_liability_limit ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm font-semibold text-slate-900">{certificate.extracted_data.auto_liability_limit}</p>
                        {certificate.extracted_data.auto_coverage_type && (
                          <div className="flex flex-wrap gap-1.5">
                            {certificate.extracted_data.auto_coverage_type.any_auto && <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">Any Auto</span>}
                            {certificate.extracted_data.auto_coverage_type.owned && <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">Owned</span>}
                            {certificate.extracted_data.auto_coverage_type.hired && <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">Hired</span>}
                            {certificate.extracted_data.auto_coverage_type.non_owned && <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">Non-Owned</span>}
                          </div>
                        )}
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5">
                            {certificate.extracted_data.auto_addl_insured ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                            <span className="text-xs text-slate-600">Addl Insured</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {certificate.extracted_data.auto_subr_wvd ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                            <span className="text-xs text-slate-600">SUBR WVD</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">Not Present</p>
                    )}
                  </div>

                  {/* Umbrella / Excess */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Umbrella / Excess</label>
                    {certificate.extracted_data.umbrella_liability_limit ? (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-sm font-semibold text-slate-900">{certificate.extracted_data.umbrella_liability_limit}</p>
                        {certificate.extracted_data.umbrella_type && (
                          <span className="px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-700">
                            {certificate.extracted_data.umbrella_type === 'UMBRELLA' ? 'Umbrella' : 'Excess'}
                          </span>
                        )}
                        {certificate.extracted_data.umbrella_deductible && (
                          <p className="text-xs text-slate-500">Deductible: {certificate.extracted_data.umbrella_deductible}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">Not Present</p>
                    )}
                  </div>

                  {/* Workers Compensation */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Workers Compensation</label>
                    {certificate.extracted_data.workers_comp_limit ? (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-sm font-semibold text-slate-900">{certificate.extracted_data.workers_comp_limit}</p>
                        {certificate.extracted_data.workers_comp_statutory != null && (
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                            {certificate.extracted_data.workers_comp_statutory ? 'Statutory' : 'State Limits'}
                          </span>
                        )}
                        {certificate.extracted_data.wc_proprietor_excluded === true && (
                          <p className="text-xs text-amber-600 font-medium">Sole Proprietor Excluded</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">Not Present</p>
                    )}
                  </div>

                  {/* Liquor Liability */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Liquor Liability</label>
                    {certificate.extracted_data.liquor_liability_limit ? (
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-slate-900">{certificate.extracted_data.liquor_liability_limit}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">Not Present</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description of Operations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Description of Operations</h3>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{certificate.extracted_data.description_of_operations || 'Not provided'}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Legacy format fallback for older certificates */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Insurance Company</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.insuranceCompany || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Policy Number</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.policyNumber || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Effective Date</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.effectiveDate || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expiration Date</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.expirationDate || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">General Liability</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.generalLiability || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aggregate Limit</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.aggregateLimit || '—'}</p>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Certificate Holder</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.certificateHolder || '—'}</p>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Additional Insured</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.additionalInsured || '—'}</p>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Description</label>
                <p className="text-sm text-slate-900 mt-1">{certificate.extracted_data.description || '—'}</p>
              </div>
            </div>
          )}
        </div>

          {/* Validation Issues */}
          {certificate.validation_issues.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Validation Issues</h2>
              <div className="space-y-4">
                {certificate.validation_issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`border-l-4 pl-4 py-2 ${
                      issue.severity === 'error'
                        ? 'border-red-500 bg-red-50'
                        : issue.severity === 'warning'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        issue.severity === 'error'
                          ? 'text-red-700'
                          : issue.severity === 'warning'
                          ? 'text-amber-700'
                          : 'text-blue-700'
                      }`}>
                        {issue.severity}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{issue.field}: {issue.issue}</p>
                        <p className="text-xs text-slate-600 mt-1">{issue.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remediation Email Preview */}
          {certificate.validation_issues.some(i => i.severity === 'error' || i.severity === 'warning') && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Remediation Email Preview</h2>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">To</p>
                  <p className="text-sm text-slate-900">{certificate.vendor.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</p>
                  <p className="text-sm text-slate-900">
                    Certificate {certificate.status === 'red' ? 'Rejected' : 'Requires Review'} &mdash; {certificate.vendor.name} for {certificate.event.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Body</p>
                  <div className="text-sm text-slate-800 space-y-2">
                    <p>Dear {certificate.vendor.name},</p>
                    <p>Your certificate of insurance for &quot;{certificate.event.name}&quot; has been flagged:</p>
                    {certificate.validation_issues
                      .filter(i => i.severity === 'error' || i.severity === 'warning')
                      .map((issue, idx) => (
                        <div key={idx} className="border-l-2 border-slate-300 pl-3 py-1">
                          <p className="font-medium">[{issue.severity.toUpperCase()}] {issue.field}: {issue.issue}</p>
                          <p className="text-slate-600 text-xs">{issue.detail}</p>
                        </div>
                      ))
                    }
                    <p>Please review and resubmit a corrected certificate at your earliest convenience.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Review Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this certificate review (optional for approval, required for rejection)..."
              className="w-full h-32 px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 bg-white hover:bg-red-50 text-red-700 border-2 border-red-300 px-6 py-3 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Reject Certificate
            </button>
            <button
              onClick={() => setShowApproveModal(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Approve & Lock
            </button>
          </div>
        </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Approve Certificate?</h3>
                <p className="text-sm text-slate-600">This action will lock the certificate as approved</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-medium text-slate-500">Approving as:</p>
                <p className="text-sm font-semibold text-slate-900">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Unknown User'}
                </p>
              </div>
              <p className="text-sm text-slate-700">
                <strong>{certificate.vendor.name}</strong> will be notified via email that their certificate has been approved for <strong>{certificate.event.name}</strong>.
              </p>
              {notes && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-1">Your notes:</p>
                  <p className="text-sm text-slate-700">{notes}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reject Certificate?</h3>
                <p className="text-sm text-slate-600">Vendor will be notified to resubmit</p>
              </div>
            </div>
            {!notes.trim() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Notes required:</strong> Please explain why this certificate is being rejected so the vendor knows what to fix.
                </p>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-700 mb-3">
                <strong>{certificate.vendor.name}</strong> will receive an email with:
              </p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Rejection notification</li>
                <li>• Your notes explaining the issues</li>
                <li>• Link to resubmit corrected certificate</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
