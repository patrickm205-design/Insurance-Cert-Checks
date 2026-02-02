import { Mail, Eye, Send } from 'lucide-react';
import TrafficLightBadge from './certificates/TrafficLightBadge';

type VendorStatus = 'green' | 'yellow' | 'red' | 'gray';

interface Vendor {
  id: string;
  name: string;
  email: string;
  type: string;
  status: VendorStatus;
  humanApproved?: boolean;
  policyExpires?: string;
  coverage?: string;
  issues?: string[];
}

interface VendorTableProps {
  vendors: Vendor[];
}

export default function VendorTable({ vendors }: VendorTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Vendor Name
            </th>
            <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Type
            </th>
            <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Policy Expires
            </th>
            <th className="text-left py-4 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Coverage
            </th>
            <th className="text-right py-4 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor, index) => (
            <tr
              key={vendor.id}
              className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                index === vendors.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <td className="py-4 px-6">
                <div>
                  <p className="text-sm font-medium text-slate-900">{vendor.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-sm text-slate-500">{vendor.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm text-slate-700">{vendor.type}</span>
              </td>
              <td className="py-4 px-6">
                <TrafficLightBadge
                  status={vendor.status}
                  humanApproved={vendor.humanApproved}
                />
                {vendor.issues && vendor.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {vendor.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        • {issue}
                      </p>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-4 px-6">
                <span className="text-sm text-slate-700">
                  {vendor.policyExpires || '—'}
                </span>
              </td>
              <td className="py-4 px-6">
                <span className="text-sm text-slate-700">
                  {vendor.coverage || '—'}
                </span>
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center justify-end gap-2">
                  {vendor.status === 'gray' ? (
                    <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      Request COI
                    </button>
                  ) : (
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" />
                      Review
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
