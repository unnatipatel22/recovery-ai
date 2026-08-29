import React, { useState } from 'react';
import {
  CreditCard,
  ShoppingBag,
  FileText,
  Search,
  Filter,
  Eye,
  Play,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const EVENT_TYPE_ICONS = {
  failed_payment: { icon: CreditCard, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  abandoned_checkout: { icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  overdue_invoice: { icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

const STATUS_BADGES = {
  recovered: { label: 'Recovered', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  pending: { label: 'Pending', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: Clock },
  escalated: { label: 'Escalated', bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30', icon: AlertTriangle },
  failed: { label: 'Failed', bg: 'bg-slate-800 text-slate-400 border-slate-700', icon: RotateCcw },
  blocked: { label: 'Blocked', bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30', icon: ShieldAlert },
};

export default function EventsTable({
  events,
  totalEvents,
  page,
  pageSize,
  onPageChange,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  searchTerm,
  setSearchTerm,
  onSelectEvent,
  onRunSingle,
  runningEventId,
}) {
  const totalPages = Math.ceil(totalEvents / pageSize) || 1;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
      {/* Table Header & Filters */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, ID, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="recovered">Recovered</option>
            <option value="escalated">Escalated</option>
            <option value="failed">Failed</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Event Types</option>
            <option value="failed_payment">Failed Subscription Payment</option>
            <option value="abandoned_checkout">Abandoned Checkout</option>
            <option value="overdue_invoice">Overdue B2B Invoice</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Event & Type</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Failure Reason</th>
              <th className="py-3 px-4 text-center">Retries</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No payment events found matching the filters. Generate a new batch above!
                </td>
              </tr>
            ) : (
              events.map((evt) => {
                const typeConfig = EVENT_TYPE_ICONS[evt.event_type] || EVENT_TYPE_ICONS.failed_payment;
                const TypeIcon = typeConfig.icon;
                const statusConfig = STATUS_BADGES[evt.status] || STATUS_BADGES.pending;
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors group">
                    {/* Event & Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${typeConfig.bg} ${typeConfig.color}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-mono text-[11px] text-slate-300 font-medium">{evt.id}</div>
                          <div className="text-[10px] text-slate-500 capitalize">{evt.event_type.replace('_', ' ')}</div>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{evt.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{evt.customer_email}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{formatCurrency(evt.amount)}</div>
                      <div className="text-[10px] text-slate-400">
                        {evt.metadata?.subscription_plan || evt.metadata?.cart_items || evt.metadata?.invoice_number || 'Standard'}
                      </div>
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                        {evt.failure_reason.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Retries */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          evt.retry_count >= 3
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : evt.retry_count > 0
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {evt.retry_count}/3
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConfig.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusConfig.label}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {evt.status === 'pending' && (
                          <button
                            onClick={() => onRunSingle(evt.id)}
                            disabled={runningEventId === evt.id}
                            title="Run Autonomous Agent on this event"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all text-xs flex items-center gap-1"
                          >
                            {runningEventId === evt.id ? (
                              <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => onSelectEvent(evt.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/20 text-[11px] font-semibold transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect Trace</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-900/40">
        <div>
          Showing <span className="font-semibold text-slate-200">{events.length}</span> of{' '}
          <span className="font-semibold text-slate-200">{totalEvents}</span> events
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-300 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
