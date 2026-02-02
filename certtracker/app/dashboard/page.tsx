import { Plus, AlertCircle, Clock, CheckCircle, Calendar } from 'lucide-react';
import EventCard from '@/components/dashboard/EventCard';

// Mock data for events
const events = [
  {
    id: '1',
    name: 'Johnson-Smith Wedding',
    type: 'Wedding',
    date: 'Apr 15, 2025',
    client: 'Emily Johnson & Michael Smith',
    vendors: {
      approved: 4,
      needsReview: 1,
      issues: 1,
      notUploaded: 0,
    },
  },
  {
    id: '2',
    name: 'TechCorp Annual Conference',
    type: 'Conference',
    date: 'May 22, 2025',
    client: 'TechCorp Industries',
    vendors: {
      approved: 3,
      needsReview: 2,
      issues: 1,
      notUploaded: 2,
    },
  },
  {
    id: '3',
    name: 'Martinez Quinceañera',
    type: 'Quinceañera',
    date: 'Jun 7, 2025',
    client: 'Maria Martinez',
    vendors: {
      approved: 5,
      needsReview: 0,
      issues: 0,
      notUploaded: 0,
    },
  },
  {
    id: '4',
    name: 'Anderson Charity Gala',
    type: 'Gala',
    date: 'Jul 18, 2025',
    client: 'Anderson Foundation',
    vendors: {
      approved: 1,
      needsReview: 3,
      issues: 2,
      notUploaded: 4,
    },
  },
];

// Calculate stats from events
const stats = {
  totalEvents: events.length,
  needsAttention: events.filter(
    (e) => e.vendors.issues > 0 || e.vendors.needsReview > 0
  ).length,
  expiringSoon: 2, // Mock data
  approvedThisWeek: 12, // Mock data
};

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500 mt-1">Manage venue events and vendor certificates</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Events</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.totalEvents}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Needs Attention</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.needsAttention}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Expiring Soon</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.expiringSoon}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Approved This Week</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.approvedThisWeek}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h2>
        <div className="grid grid-cols-2 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </div>
    </div>
  );
}
