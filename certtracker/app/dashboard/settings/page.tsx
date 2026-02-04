'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

type VenueSettings = {
  venue_name: string;
  venue_address: string;
  min_gl_limit: number;
  min_aggregate_limit: number;
  max_deductible: number;
  required_ai_text: string;
  require_subr_wvd: boolean;
  require_liquor: boolean;
  min_liquor_limit: number;
  strict_workers_comp: boolean;
  expiration_buffer_days: number;
  validation_mode: 'strict' | 'warning';
};

const DEFAULTS: VenueSettings = {
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
  expiration_buffer_days: 0,
  validation_mode: 'warning',
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}></span>
    </button>
  );
}

function CurrencyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const display = value.toLocaleString('en-US');
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
      <input
        type="text"
        value={display}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9]/g, '');
          onChange(cleaned ? parseInt(cleaned, 10) : 0);
        }}
        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

export default function VenueSettingsPage() {
  const [settings, setSettings] = useState<VenueSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/venue-settings');
        if (response.ok) {
          const data = await response.json();
          setSettings({
            venue_name: data.venue_name || '',
            venue_address: data.venue_address || '',
            min_gl_limit: Number(data.min_gl_limit) || 1000000,
            min_aggregate_limit: Number(data.min_aggregate_limit) || 2000000,
            max_deductible: Number(data.max_deductible) || 5000,
            required_ai_text: data.required_ai_text || '',
            require_subr_wvd: Boolean(data.require_subr_wvd),
            require_liquor: Boolean(data.require_liquor),
            min_liquor_limit: Number(data.min_liquor_limit) || 1000000,
            strict_workers_comp: Boolean(data.strict_workers_comp),
            expiration_buffer_days: Number(data.expiration_buffer_days) || 0,
            validation_mode: data.validation_mode === 'strict' ? 'strict' : 'warning',
          });
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/venue-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof VenueSettings>(key: K, value: VenueSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Venue Settings</h1>
          <p className="text-sm text-slate-600 mt-1">Configure insurance verification requirements for your venue</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Feedback */}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <p className="text-sm text-emerald-800">Settings saved successfully</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Identity Verification */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Identity Verification</h2>
          <p className="text-xs text-slate-500 mb-4">The AI checks the Certificate Holder box to ensure these details match your venue.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Legal Venue Name</label>
              <input
                type="text"
                value={settings.venue_name}
                onChange={e => set('venue_name', e.target.value)}
                placeholder="e.g., The Historic Barn LLC"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Venue Address</label>
              <input
                type="text"
                value={settings.venue_address}
                onChange={e => set('venue_address', e.target.value)}
                placeholder="e.g., 123 Main St, City, ST 12345"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Liability Thresholds */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Financial Liability Thresholds</h2>
          <p className="text-xs text-slate-500 mb-4">Minimum coverage amounts required on each certificate.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Min General Liability</label>
              <CurrencyInput value={settings.min_gl_limit} onChange={v => set('min_gl_limit', v)} />
              <p className="text-xs text-slate-400 mt-1">Each Occurrence</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Min General Aggregate</label>
              <CurrencyInput value={settings.min_aggregate_limit} onChange={v => set('min_aggregate_limit', v)} />
              <p className="text-xs text-slate-400 mt-1">General Aggregate</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Max Deductible</label>
              <CurrencyInput value={settings.max_deductible} onChange={v => set('max_deductible', v)} />
              <p className="text-xs text-slate-400 mt-1">Optional flag</p>
            </div>
          </div>
        </div>

        {/* 3. Endorsement Requirements */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Text & Endorsement Matching</h2>
          <p className="text-xs text-slate-500 mb-4">The AI scans the Description of Operations for required language.</p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Required Description of Operations Text</label>
            <textarea
              value={settings.required_ai_text}
              onChange={e => set('required_ai_text', e.target.value)}
              placeholder={'e.g., "The Historic Barn LLC is named as Additional Insured"'}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-900">Require Waiver of Subrogation</p>
              <p className="text-xs text-slate-500">AI checks for the SUBR WVD checkbox on General Liability</p>
            </div>
            <Toggle on={settings.require_subr_wvd} onChange={() => set('require_subr_wvd', !settings.require_subr_wvd)} />
          </div>
        </div>

        {/* 4. Conditional Risk Rules */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Conditional Risk Rules</h2>
          <p className="text-xs text-slate-500 mb-4">Rules that activate based on vendor type.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">Enforce Liquor Liability for Alcohol Vendors</p>
                <p className="text-xs text-slate-500">Vendors tagged as "Catering/Bar" must carry Liquor Liability</p>
              </div>
              <Toggle on={settings.require_liquor} onChange={() => set('require_liquor', !settings.require_liquor)} />
            </div>
            {settings.require_liquor && (
              <div className="ml-4 mt-2">
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Min Liquor Liability Limit</label>
                <div className="w-48">
                  <CurrencyInput value={settings.min_liquor_limit} onChange={v => set('min_liquor_limit', v)} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">Strict Workers Comp Enforcement</p>
                <p className="text-xs text-slate-500">If OFF, solo vendors (e.g., guitarist) can pass without Workers Comp</p>
              </div>
              <Toggle on={settings.strict_workers_comp} onChange={() => set('strict_workers_comp', !settings.strict_workers_comp)} />
            </div>
          </div>
        </div>

        {/* 5. Date & Buffer */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Date & Buffer Logic</h2>
          <p className="text-xs text-slate-500 mb-4">Require policies to remain valid beyond the event date.</p>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Expiration Safety Buffer</label>
              <input
                type="number"
                min="0"
                value={settings.expiration_buffer_days}
                onChange={e => set('expiration_buffer_days', parseInt(e.target.value, 10) || 0)}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-sm text-slate-600 mb-0.5">days after event date</p>
          </div>
        </div>

        {/* 6. Enforcement Mode */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Enforcement Mode</h2>
          <p className="text-xs text-slate-500 mb-4">Controls how validation failures are displayed.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => set('validation_mode', 'strict')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                settings.validation_mode === 'strict'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`text-sm font-semibold ${settings.validation_mode === 'strict' ? 'text-indigo-900' : 'text-slate-900'}`}>Strict (Blocker)</p>
              <p className="text-xs text-slate-500 mt-1">Failures show as red FAIL. Certificate cannot be approved without resolving issues.</p>
            </button>
            <button
              onClick={() => set('validation_mode', 'warning')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                settings.validation_mode === 'warning'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`text-sm font-semibold ${settings.validation_mode === 'warning' ? 'text-indigo-900' : 'text-slate-900'}`}>Warning (Soft Pass)</p>
              <p className="text-xs text-slate-500 mt-1">Failures show as yellow "Review Needed". User can manually override and approve.</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
