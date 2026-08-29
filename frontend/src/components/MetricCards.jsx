import React from 'react';
import { IndianRupee, TrendingUp, CheckCircle2, AlertOctagon, Clock, ShieldAlert } from 'lucide-react';

export default function MetricCards({ metrics }) {
  const atRisk = metrics?.total_at_risk || 0;
  const recovered = metrics?.total_recovered || 0;
  const rate = metrics?.recovery_rate_pct || 0;
  const statusCounts = metrics?.status_counts || { pending: 0, recovered: 0, failed: 0, escalated: 0, blocked: 0 };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total at Risk */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total at Risk</span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-white tracking-tight">{formatCurrency(atRisk)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">{metrics?.total_events || 0}</span> total payment events
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500 opacity-60"></div>
      </div>

      {/* Total Recovered */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all glow-emerald">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue Recovered</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">{formatCurrency(recovered)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-300/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{statusCounts.recovered} payments captured</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
      </div>

      {/* Recovery Rate % */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all glow-indigo">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recovery Rate</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-indigo-300 tracking-tight">{rate}%</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{statusCounts.pending} pending autonomous run</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
      </div>

      {/* Guardrail & Escalations */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Policy Guardrails</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-amber-300 tracking-tight">
            {statusCounts.escalated + statusCounts.blocked}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>{statusCounts.escalated} escalated for human review</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500 opacity-60"></div>
      </div>
    </div>
  );
}
