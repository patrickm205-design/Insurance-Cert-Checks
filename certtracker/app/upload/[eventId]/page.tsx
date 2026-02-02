'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle, AlertCircle, FileText, Building2, Mail, User } from 'lucide-react';

// Mock event data - in production this would come from the database
const eventData: Record<string, { name: string; date: string; venue: string }> = {
  '1': {
    name: 'Johnson-Smith Wedding',
    date: 'Apr 15, 2025',
    venue: 'Grand Ballroom at The Plaza',
  },
};

type UploadStep = 'form' | 'uploading' | 'success' | 'error';

export default function VendorUploadPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [step, setStep] = useState<UploadStep>('form');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const event = eventData[eventId];

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Event Not Found</h1>
          <p className="text-sm text-slate-600">
            The upload link you're using appears to be invalid. Please check with the venue for the correct link.
          </p>
        </div>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file) => file.type === 'application/pdf');

    if (pdfFile) {
      validateAndSetFile(pdfFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError('');

    // Check file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted');
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!vendorName.trim()) {
      setError('Please enter your company name');
      return;
    }
    if (!vendorEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!vendorType) {
      setError('Please select your vendor type');
      return;
    }
    if (!selectedFile) {
      setError('Please upload your certificate of insurance');
      return;
    }

    // Simulate upload progress
    setStep('uploading');
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep('success');
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // In production, this would upload to Supabase Storage
    // const formData = new FormData();
    // formData.append('file', selectedFile);
    // formData.append('vendorName', vendorName);
    // formData.append('vendorEmail', vendorEmail);
    // formData.append('vendorType', vendorType);
    // await uploadCertificate(eventId, formData);
  };

  const vendorTypes = [
    'Caterer',
    'DJ / Entertainment',
    'Photographer',
    'Videographer',
    'Florist',
    'Baker / Cake Designer',
    'Event Planner',
    'Rental Company',
    'AV Company',
    'Transportation',
    'Security',
    'Other',
  ];

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Upload Successful!</h1>
          <p className="text-sm text-slate-600 mb-6">
            Thank you for submitting your Certificate of Insurance for <strong>{event.name}</strong>.
            We've received your certificate and will review it shortly.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-slate-600 mb-2">
              <strong className="text-slate-900">What's next?</strong>
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• We'll review your certificate within 24 hours</li>
              <li>• You'll receive an email at <strong>{vendorEmail}</strong></li>
              <li>• If any issues are found, we'll contact you directly</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            You can close this window now.
          </p>
        </div>
      </div>
    );
  }

  // Uploading screen
  if (step === 'uploading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Uploading Certificate...</h1>
            <p className="text-sm text-slate-600">Please don't close this window</p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{selectedFile?.name}</span>
              <span className="text-sm font-medium text-indigo-600">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Upload Certificate of Insurance</h1>
          <p className="text-sm text-slate-600">For: <strong>{event.name}</strong></p>
          <p className="text-sm text-slate-500">{event.date} • {event.venue}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-8">
          {/* Vendor Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Vendor Information</h2>
            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="vendorName" className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    id="vendorName"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Apex Catering"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="vendorEmail" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    id="vendorEmail"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="contact@company.com"
                    required
                  />
                </div>
              </div>

              {/* Vendor Type */}
              <div>
                <label htmlFor="vendorType" className="block text-sm font-medium text-slate-700 mb-2">
                  Vendor Type *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    id="vendorType"
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                    required
                  >
                    <option value="">Select vendor type...</option>
                    {vendorTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Certificate of Insurance</h2>
            <p className="text-sm text-slate-600 mb-4">
              Please upload your <strong>ACORD 25</strong> Certificate of Liability Insurance in PDF format.
            </p>

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-50/50'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
              }`}
            >
              <input
                type="file"
                id="fileUpload"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mb-4">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Choose a different file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-slate-500">Maximum file size: 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Upload Certificate
          </button>

          {/* Help Text */}
          <p className="text-xs text-slate-500 text-center mt-4">
            By uploading, you confirm this is an accurate Certificate of Insurance for your company.
          </p>
        </form>
      </div>
    </div>
  );
}
