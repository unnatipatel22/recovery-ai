import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Send,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Bot,
  BrainCircuit,
  FileCheck2,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ExplainabilityDrawer({ eventDetail, onClose }) {
  const [langTab, setLangTab] = useState('hinglish'); // 'hinglish' | 'english'
  const [copied, setCopied] = useState(false);

  if (!eventDetail) return null;

  const event = eventDetail.event || eventDetail;
  const auditLogs = eventDetail.audit_logs || eventDetail.logs || [];

  // Group logs by step
  const detectLog = auditLogs.find((l) => l.step === 'detect');
  const diagnoseLog = auditLogs.find((l) => l.step === 'diagnose');
  const decideLog = auditLogs.find((l) => l.step === 'decide');
  const actLog = auditLogs.find((l) => l.step === 'act');
  const logLog = auditLogs.find((l) => l.step === 'log');

  const commsPayload = actLog?.payload_preview || {};
  const decidePayload = decideLog?.payload_preview || {};
  const diagnosePayload = diagnoseLog?.payload_preview || {};

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-[#0b0f19] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">LangGraph Explainability Trace</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {event.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">Step-by-step reasoning, bounded policy check & generated copy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-400 font-medium">Customer</div>
              <div className="text-slate-100 font-semibold mt-0.5 truncate">{event.customer_name}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Amount</div>
              <div className="text-emerald-400 font-bold mt-0.5">{formatCurrency(event.amount)}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Failure Reason</div>
              <div className="text-slate-200 font-medium mt-0.5 capitalize">{event.failure_reason?.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Retry Count</div>
              <div className="text-amber-300 font-bold mt-0.5">{event.retry_count} / 3</div>
            </div>
          </div>

          {/* If No Trace Logs Yet */}
          {auditLogs.length === 0 && (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl p-6">
              <Bot className="w-10 h-10 text-indigo-400/50 mx-auto mb-3" />
              <div className="font-semibold text-slate-200">Autonomous Agent Has Not Run Yet</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click "Run Autonomous Agent" on the dashboard or run this single event to execute the 5-step LangGraph workflow.
              </p>
            </div>
          )}

          {/* 5-Step Execution Timeline */}
          {auditLogs.length > 0 && (
            <div className="space-y-5">
              {/* Step 1: Detect */}
              {detectLog && (
                <div className="relative pl-6 border-l-2 border-indigo-500/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
                    1
                  </div>
                  <div className="font-bold text-xs text-indigo-300 uppercase tracking-wider mb-1">
                    Step 1: Event Ingestion & Cooldown Check
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <p>{detectLog.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Step 2: Diagnose */}
              {diagnoseLog && (
                <div className="relative pl-6 border-l-2 border-purple-500/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                    2
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-xs text-purple-300 uppercase tracking-wider">
                      Step 2: LLM Root-Cause Diagnosis
                    </div>
                    {diagnosePayload.customer_sensitivity && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Sensitivity: {diagnosePayload.customer_sensitivity}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2.5">
                    {diagnosePayload.root_cause && (
                      <div>
                        <span className="text-slate-400 font-semibold">Identified Root Cause: </span>
                        <span className="text-slate-200">{diagnosePayload.root_cause}</span>
                      </div>
                    )}
                    {diagnosePayload.reasoning && (
                      <div className="text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 italic">
                        "{diagnosePayload.reasoning}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Decide (Policy Guardrails) */}
              {decideLog && (
                <div className="relative pl-6 border-l-2 border-blue-500/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white">
                    3
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-xs text-blue-300 uppercase tracking-wider">
                      Step 3: Bounded Policy Guardrails
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        decideLog.policy_check?.includes('ESCALATED') || decideLog.policy_check?.includes('HOLD')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {decideLog.policy_check}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                    <p className="text-slate-300">{decidePayload.explanation || decideLog.reasoning}</p>

                    {/* Guardrails checklist */}
                    {decidePayload.passed_rules && decidePayload.passed_rules.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {decidePayload.passed_rules.map((rule, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {decidePayload.violated_rules && decidePayload.violated_rules.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {decidePayload.violated_rules.map((rule, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-rose-400 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Act & Generated Communications */}
              {actLog && (
                <div className="relative pl-6 border-l-2 border-emerald-500/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white">
                    4
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                      Step 4: Autonomous Action & Message Generation
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Outcome: {actLog.outcome}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
                    <p className="text-slate-300">{actLog.reasoning}</p>

                    {/* Multi-lingual Message Copy Preview */}
                    {(commsPayload.english_copy || commsPayload.hinglish_copy) && (
                      <div className="mt-3 rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden">
                        {/* Copy header & tabs */}
                        <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-semibold text-slate-300 text-[11px]">
                              Channel: {commsPayload.channel || 'Automated Outreach'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setLangTab('hinglish')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                langTab === 'hinglish' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Hinglish Copy
                            </button>
                            <button
                              onClick={() => setLangTab('english')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                langTab === 'english' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              English Copy
                            </button>
                          </div>
                        </div>

                        {/* Copy Content */}
                        <div className="p-3">
                          {commsPayload.subject && (
                            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 pb-1.5 border-b border-slate-800/80">
                              Subject: <span className="text-slate-200">{commsPayload.subject}</span>
                            </div>
                          )}
                          <pre className="font-sans text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {langTab === 'hinglish' ? commsPayload.hinglish_copy : commsPayload.english_copy}
                          </pre>
                        </div>

                        {/* Action Bar */}
                        <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          {commsPayload.action_link ? (
                            <a
                              href={commsPayload.action_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                            >
                              <span>{commsPayload.action_link}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500">Autonomous gateway routing</span>
                          )}

                          <button
                            onClick={() =>
                              handleCopy(langTab === 'hinglish' ? commsPayload.hinglish_copy : commsPayload.english_copy)
                            }
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copied' : 'Copy Message'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Log & Commit */}
              {logLog && (
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[9px] font-bold text-white">
                    5
                  </div>
                  <div className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Step 5: Audit Log & Ledger Finalization
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>{logLog.reasoning}</span>
                    <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
