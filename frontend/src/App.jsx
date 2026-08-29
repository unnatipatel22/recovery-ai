import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MetricCards from './components/MetricCards';
import BatchControls from './components/BatchControls';
import RecoveryAnalytics from './components/RecoveryAnalytics';
import EventsTable from './components/EventsTable';
import ExplainabilityDrawer from './components/ExplainabilityDrawer';
import ExceptionsHub from './components/ExceptionsHub';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'events' | 'exceptions'
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const [escalatedEvents, setEscalatedEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Execution states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [runningEventId, setRunningEventId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Selected event for Explainability Drawer
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);

  // Notification toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }, []);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        status: statusFilter,
        event_type: typeFilter,
      });
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const res = await fetch(`${API_BASE}/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setTotalEvents(data.total);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, [page, pageSize, statusFilter, typeFilter, searchTerm]);

  // Fetch Escalated Events for Exceptions Hub
  const fetchEscalatedEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/events?status=escalated&page_size=100`);
      if (res.ok) {
        const data = await res.json();
        setEscalatedEvents(data.events);
      }
    } catch (err) {
      console.error('Error fetching escalated events:', err);
    }
  }, []);

  // Load audit trail when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) {
      setEventDetail(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${selectedEventId}/audit-trail`);
        if (res.ok) {
          const data = await res.json();
          setEventDetail(data);
        }
      } catch (err) {
        console.error('Error fetching audit trail:', err);
      }
    };

    fetchDetail();
  }, [selectedEventId]);

  // Initial load
  useEffect(() => {
    fetchMetrics();
    fetchEvents();
    fetchEscalatedEvents();
  }, [fetchMetrics, fetchEvents, fetchEscalatedEvents]);

  // Auto-seed if empty on first load
  useEffect(() => {
    if (metrics && metrics.total_events === 0) {
      handleGenerate(25, 'mixed');
    }
  }, [metrics]);

  // Batch Generation Handler
  const handleGenerate = async (count, scenario) => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/generate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, scenario }),
      });
      if (res.ok) {
        showToast(`Generated ${count} synthetic payment events for scenario: ${scenario}`);
        await Promise.all([fetchMetrics(), fetchEvents(), fetchEscalatedEvents()]);
      } else {
        showToast('Failed to generate batch', 'error');
      }
    } catch (err) {
      showToast('Network error while generating batch', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Run Autonomous Agent Loop Handler
  const handleRunAgent = async () => {
    setIsRunningAgent(true);
    try {
      const res = await fetch(`${API_BASE}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`LangGraph Agent processed ${data.processed_count} revenue recovery events!`);
        await Promise.all([fetchMetrics(), fetchEvents(), fetchEscalatedEvents()]);
      } else {
        showToast('Error executing agent run', 'error');
      }
    } catch (err) {
      showToast('Network error executing agent run', 'error');
    } finally {
      setIsRunningAgent(false);
    }
  };

  // Run Single Event Agent Handler
  const handleRunSingle = async (eventId) => {
    setRunningEventId(eventId);
    try {
      const res = await fetch(`${API_BASE}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.ok) {
        showToast(`Agent executed on event ${eventId}`);
        await Promise.all([fetchMetrics(), fetchEvents(), fetchEscalatedEvents()]);
        // Open drawer on this event
        setSelectedEventId(eventId);
      }
    } catch (err) {
      showToast('Failed to process single event', 'error');
    } finally {
      setRunningEventId(null);
    }
  };

  // Human Resolution Handler
  const handleResolve = async (eventId, resolutionAction, operatorNotes) => {
    setIsResolving(true);
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_action: resolutionAction, operator_notes: operatorNotes }),
      });
      if (res.ok) {
        showToast(`Event ${eventId} manual resolution saved: ${resolutionAction}`);
        await Promise.all([fetchMetrics(), fetchEvents(), fetchEscalatedEvents()]);
      } else {
        showToast('Failed to save resolution', 'error');
      }
    } catch (err) {
      showToast('Network error saving resolution', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  // Reset Database Handler
  const handleReset = async () => {
    if (!window.confirm('Reset the database to clean initial state?')) return;
    setIsResetting(true);
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      if (res.ok) {
        showToast('Database reset successfully');
        await Promise.all([fetchMetrics(), fetchEvents(), fetchEscalatedEvents()]);
      }
    } catch (err) {
      showToast('Error resetting database', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const pendingCount = metrics?.status_counts?.pending || 0;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        onReset={handleReset}
        isResetting={isResetting}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Executive Metrics Overview */}
        <MetricCards metrics={metrics} />

        {/* Batch Generator & Agent Execution Control Bar */}
        <BatchControls
          onGenerate={handleGenerate}
          onRunAgent={handleRunAgent}
          isGenerating={isGenerating}
          isRunningAgent={isRunningAgent}
          pendingCount={pendingCount}
        />

        {/* Dynamic Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Visual Analytics & Funnel */}
            <RecoveryAnalytics metrics={metrics} />

            {/* Quick Recent Events Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-200">Recent Revenue-at-Risk Activity</h3>
                <button
                  onClick={() => setActiveTab('events')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View Full Ledger ({totalEvents}) →
                </button>
              </div>
              <EventsTable
                events={events.slice(0, 8)}
                totalEvents={totalEvents}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onSelectEvent={setSelectedEventId}
                onRunSingle={handleRunSingle}
                runningEventId={runningEventId}
              />
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-white">Full Events Ledger</h2>
              <span className="text-xs text-slate-400 font-medium">
                {totalEvents} payment failure records recorded
              </span>
            </div>
            <EventsTable
              events={events}
              totalEvents={totalEvents}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onSelectEvent={setSelectedEventId}
              onRunSingle={handleRunSingle}
              runningEventId={runningEventId}
            />
          </div>
        )}

        {activeTab === 'exceptions' && (
          <div className="animate-in fade-in duration-200">
            <ExceptionsHub
              escalatedEvents={escalatedEvents}
              onResolve={handleResolve}
              onSelectEvent={setSelectedEventId}
              isResolving={isResolving}
            />
          </div>
        )}
      </main>

      {/* Slide-out Explainability Drawer */}
      {selectedEventId && (
        <ExplainabilityDrawer
          eventDetail={eventDetail}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Recovery AI — LangGraph Autonomous Revenue Recovery Engine</span>
          <span className="font-mono text-[11px] text-slate-400">Bounded Policy Guardrails • Full Auditability</span>
        </div>
      </footer>
    </div>
  );
}
