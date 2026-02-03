'use client';

import { useState, useEffect } from 'react';
import { Plus, AlertCircle, Clock, CheckCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import EventCard from '@/components/dashboard/EventCard';
import { supabase } from '@/lib/supabase';

type Event = {
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
};

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (eventsError) throw eventsError;

        // Fetch certificate counts for each event
        const eventsWithVendors = await Promise.all(
          (eventsData || []).map(async (event) => {
            const { data: certs } = await supabase
              .from('certificates')
              .select('status, human_approved')
              .eq('event_id', event.id)
              .eq('is_latest', true);

            const approved = certs?.filter((c) => c.human_approved).length || 0;
            const issues = certs?.filter((c) => c.status === 'red' && !c.human_approved).length || 0;
            const needsReview = certs?.filter((c) => !c.human_approved && c.status !== 'red').length || 0;

            return {
              id: event.id,
              name: event.name,
              type: event.type,
              date: event.date,
              client: event.client,
              vendors: {
                approved,
                needsReview,
                issues,
                notUploaded: 0,
              },
            };
          })
        );

        setEvents(eventsWithVendors);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Separate upcoming and past events
  const today = new Date();
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= today;
  });
  const pastEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate < today;
  });

  // Calculate stats from upcoming events
  const stats = {
    totalEvents: upcomingEvents.length,
    needsAttention: upcomingEvents.filter(
      (e) => e.vendors.issues > 0 || e.vendors.needsReview > 0
    ).length,
    expiringSoon: 0, // Will be calculated from certificate expiration dates
    approvedThisWeek: 0, // Will be calculated from recent approvals
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading events...</p>
        </div>
      </div>
    );
  }
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

      {/* Upcoming Events List */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Upcoming Events ({upcomingEvents.length})
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No upcoming events</h3>
            <p className="text-sm text-slate-600 mb-4">
              Create a new event to start managing vendor certificates
            </p>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}
      </div>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div>
          <button
            onClick={() => setShowPastEvents(!showPastEvents)}
            className="flex items-center justify-between w-full mb-4 text-left"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Past Events ({pastEvents.length})
            </h2>
            {showPastEvents ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {showPastEvents && (
            <div className="grid grid-cols-2 gap-6">
              {pastEvents.map((event) => (
                <div key={event.id} className="opacity-75">
                  <EventCard {...event} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
