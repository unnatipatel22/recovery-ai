import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  Ban,
  RotateCcw,
  CheckCircle2,
  Eye,
  MessageSquareQuote,
  ShieldCheck
} from 'lucide-react';

export default function ExceptionsHub({
  escalatedEvents,
  onResolve,
  onSelectEvent,
  isResolving
}) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [actionType, setActionType] = useState('manual_settled'); // manual_settled | write_off | reattempt_approved
  const [operatorNotes, setOperatorNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const openResolutionModal = (evtId, defaultAction) => {
    setSelectedEventId(evtId);
    setActionType(defaultAction);
    setOperatorNotes(
      defaultAction === 'manual_settled'
        ? 'Customer confirmed offline UPI/NEFT transfer with finance desk.'
        : defaultAction === 'write_off'
        ? 'Customer unreachable after max attempts; written off as bad debt.'
        : 'Approved special manual reattempt after customer profile verification.'
    );
    setModalOpen(true);
  };

  const handleConfirmResolution = () => {
    if (!selectedEventId) return;
    onResolve(selectedEventId, actionType, operatorNotes);
    setModalOpen(false);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/20 via-slate-900/60 to-slate-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Exceptions Desk (Human-in-the-Loop)</h2>
            <p className="text-xs text-slate-400">
              Bounded policy engine isolated these events to prevent spamming, reputational damage, or compliance breaches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {escalatedEvents.length} Cases Requiring Operator Decision
          </span>
        </div>
      </div>

      {/* Exceptions Grid */}
      {escalatedEvents.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="font-bold text-base text-slate-200">Zero Pending Escalations</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All revenue recovery interventions have either succeeded autonomously, are queued within bounds, or have been resolved by human ops.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {escalatedEvents.map((evt) => {
            const isFraud = evt.failure_reason === 'fraud_flag';
            const isMaxRetry = evt.retry_count >= 3;

            return (
              <div
                key={evt.id}
                className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-300 font-bold">{evt.id}</span>
                        {isFraud ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                            Risk Shield Flag
                          </span>
                        ) : isMaxRetry ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                            Max Retries (3/3)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                            Policy Hold
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white mt-1">{evt.customer_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{evt.customer_email}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-white">{formatCurrency(evt.amount)}</div>
                      <div className="text-[11px] text-slate-400 capitalize">{evt.event_type.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {/* Guardrail Violation Reason */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isFraud
                          ? 'Automated charges blocked due to suspicious velocity/anti-fraud trigger.'
                          : isMaxRetry
                          ? `Max bounded limit of 3 retries exceeded (${evt.retry_count} prior attempts).`
                          : `Policy requires human signoff for ${evt.failure_reason}.`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operator Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => onSelectEvent(evt.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Trace</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openResolutionModal(evt.id, 'manual_settled')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Manual Settle</span>
                    </button>

                    <button
                      onClick={() => openResolutionModal(evt.id, 'write_off')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Write Off</span>
                    </button>

                    <button
                      onClick={() => openResolutionModal(evt.id, 'reattempt_approved')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset & Retry</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Resolution Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Confirm Manual Resolution</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Resolution Action
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="manual_settled">Mark as Manually Settled (Captured ₹)</option>
                <option value="write_off">Mark as Written Off / Bad Debt</option>
                <option value="reattempt_approved">Reset Retry Limit & Approve Reattempt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Operator Audit Notes
              </label>
              <textarea
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolution}
                disabled={isResolving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30"
              >
                {isResolving ? 'Resolving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
