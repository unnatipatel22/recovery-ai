import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Filter, PieChart as PieIcon, BarChart3, GitFork } from 'lucide-react';

const STATUS_COLORS = {
  recovered: '#10b981', // emerald
  pending: '#f59e0b',   // amber
  escalated: '#f43f5e', // rose
  failed: '#64748b',    // slate
  blocked: '#a855f7',   // purple
};

const REASON_LABELS = {
  insufficient_funds: 'Low Balance',
  expired_card: 'Expired Card',
  network_error: 'Gateway Timeout',
  cart_abandoned: 'Cart Drop-off',
  invoice_overdue: 'B2B Overdue',
  fraud_flag: 'Risk/Fraud Flag',
  invalid_vpa: 'Invalid UPI VPA'
};

export default function RecoveryAnalytics({ metrics }) {
  const funnel = metrics?.funnel || { detected: 0, diagnosed: 0, policy_approved: 0, recovered: 0, escalated: 0 };
  const reasonCounts = metrics?.reason_counts || {};
  const statusCounts = metrics?.status_counts || {};

  // Funnel Data
  const funnelData = [
    { stage: '1. Detect', count: funnel.detected, fill: '#6366f1' },
    { stage: '2. Diagnose', count: funnel.diagnosed, fill: '#8b5cf6' },
    { stage: '3. Policy Gated', count: funnel.policy_approved, fill: '#3b82f6' },
    { stage: '4. Recovered', count: funnel.recovered, fill: '#10b981' },
    { stage: '5. Escalated', count: funnel.escalated, fill: '#f43f5e' },
  ];

  // Reasons Data
  const reasonsData = Object.entries(reasonCounts).map(([key, val]) => ({
    name: REASON_LABELS[key] || key,
    count: val,
  })).sort((a, b) => b.count - a.count);

  // Status Pie Data
  const statusData = [
    { name: 'Recovered', value: statusCounts.recovered || 0, color: STATUS_COLORS.recovered },
    { name: 'Pending', value: statusCounts.pending || 0, color: STATUS_COLORS.pending },
    { name: 'Escalated', value: statusCounts.escalated || 0, color: STATUS_COLORS.escalated },
    { name: 'Failed / Other', value: statusCounts.failed || 0, color: STATUS_COLORS.failed },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 5-Step Agent Funnel */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-200">Autonomous Agent Funnel</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
            5-Step LangGraph Trace
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} width={85} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Failure Reason Breakdown */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-slate-200">Failure Reasons Ingested</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
            Catalog Distribution
          </span>
        </div>

        <div className="h-60 w-full">
          {reasonsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No events generated yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonsData} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" interval={0} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status Breakdown Pie */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-200">Recovery Status Outcome</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
            Current State
          </span>
        </div>

        <div className="h-60 w-full flex items-center justify-center">
          {statusData.length === 0 ? (
            <div className="text-xs text-slate-500">No events data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend
                  formatter={(val) => <span className="text-slate-300 text-[11px]">{val}</span>}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
