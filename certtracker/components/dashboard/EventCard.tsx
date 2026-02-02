import Link from 'next/link';
import { Calendar, User2 } from 'lucide-react';

interface EventCardProps {
  id: string;
  name: string;
  type: string;
  date: string;
  client: string;
  vendors: {
    approved: number;
    needsReview: number;
    issues: number;
    notUploaded: number;
  };
}

export default function EventCard({ id, name, type, date, client, vendors }: EventCardProps) {
  const total = vendors.approved + vendors.needsReview + vendors.issues + vendors.notUploaded;

  return (
    <Link href={`/dashboard/events/${id}`}>
      <div className="bg-white border border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{name}</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
              {type}
            </span>
          </div>
        </div>

        {/* Date and Client */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User2 className="w-4 h-4 text-slate-400" />
            <span>{client}</span>
          </div>
        </div>

        {/* Vendor Status */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <span className="text-sm text-slate-500">Vendors:</span>
          <div className="flex items-center gap-2">
            {vendors.approved > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-slate-700">{vendors.approved}</span>
              </div>
            )}
            {vendors.needsReview > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-slate-700">{vendors.needsReview}</span>
              </div>
            )}
            {vendors.issues > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-slate-700">{vendors.issues}</span>
              </div>
            )}
            {vendors.notUploaded > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm font-medium text-slate-700">{vendors.notUploaded}</span>
              </div>
            )}
            <span className="text-sm text-slate-500 ml-1">/ {total}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
