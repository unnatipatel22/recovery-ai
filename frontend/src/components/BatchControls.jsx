import React, { useState } from 'react';
import { Play, Sparkles, Database, Sliders, ChevronDown, Check, Zap } from 'lucide-react';

const SCENARIOS = [
  { id: 'mixed', label: 'Mixed Real-World SaaS & Retail', desc: 'Standard distribution of payment, cart & invoice failures' },
  { id: 'high_churn', label: 'Subscription Auto-Pay Churn', desc: 'Expired cards, insufficient funds, mandate drop-offs' },
  { id: 'checkout_dropoffs', label: 'E-Commerce Cart Abandonment', desc: 'High-intent shoppers dropped off at checkout' },
  { id: 'b2b_invoices', label: 'B2B Overdue Invoices', desc: 'High-ticket Net-30 enterprise invoice delays' },
  { id: 'fraud_anomalies', label: 'Risk & Fraud Shield Anomalies', desc: 'Velocity anomalies triggering safety compliance holds' },
];

export default function BatchControls({ onGenerate, onRunAgent, isGenerating, isRunningAgent, pendingCount }) {
  const [scenario, setScenario] = useState('mixed');
  const [count, setCount] = useState(25);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedScenarioObj = SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0];

  const handleGenerate = () => {
    onGenerate(count, scenario);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
      {/* Scenario & Batch Config */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Scenario Selector Dropdown */}
        <div className="relative">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-indigo-400" />
            Simulation Scenario
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full sm:w-72 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-left text-xs font-medium text-slate-200 hover:border-slate-600 transition-all"
          >
            <div className="truncate">
              <span className="font-semibold text-white">{selectedScenarioObj.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 divide-y divide-slate-800">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setScenario(s.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                    scenario === s.id ? 'bg-indigo-600/20 text-indigo-200' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-100">{s.label}</div>
                    <div className="text-[11px] text-slate-400">{s.desc}</div>
                  </div>
                  {scenario === s.id && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Database className="w-3 h-3 text-purple-400" />
            Batch Size
          </label>
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            {[10, 25, 50, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  count === num
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="sm:self-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : `Generate +${count}`}</span>
          </button>
        </div>
      </div>

      {/* Main Autonomous Agent Run Trigger */}
      <div className="flex items-center gap-3 self-end sm:self-auto w-full lg:w-auto">
        <button
          onClick={onRunAgent}
          disabled={isRunningAgent || pendingCount === 0}
          className={`w-full lg:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98] ${
            pendingCount === 0
              ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-emerald-500/20'
          }`}
        >
          {isRunningAgent ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Executing LangGraph Recovery Loop...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-emerald-100" />
              <span>Run Autonomous Agent ({pendingCount} Pending)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
