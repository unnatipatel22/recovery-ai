# 🛡️ Recovery AI — Autonomous Revenue Recovery Agent

Recovery AI is an autonomous, explainable revenue recovery engine powered by **LangGraph**, **Claude 3.5 Sonnet / Heuristic LLM Reasoning**, and **Bounded Business Policy Guardrails**. It autonomously detects revenue-at-risk events (subscription billing failures, abandoned checkouts, overdue B2B invoices), diagnoses root causes, enforces strict merchant safety policies, executes simulated multi-channel interventions with English & Hinglish communication copy, and maintains a transparent, auditable ledger.

---

## 🚀 Key Features

1. **Autonomous 5-Step LangGraph State Machine**:
   - **`Detect`**: Ingests event, checks cooldown periods, deduplication, and past retry counters.
   - **`Diagnose`**: Claude / Heuristic LLM analyzes customer lifetime value, failure reason, sensitivity, and recommends an optimal recovery route.
   - **`Decide` (Bounded Guardrails)**: Enforces business policies:
     - **Max 3 Retries Cap**: Automatically escalates to human review after 3 failed attempts to protect brand reputation and prevent merchant payment gateway penalties.
     - **Expired Card Rule**: Strictly blocks direct charging on expired cards; routes to instant 1-click update link.
     - **Risk/Fraud Shield**: Immediately isolates velocity anomalies or fraud flags for compliance review.
   - **`Act`**: Generates multi-lingual customer outreach copy (**Hinglish & English**) across WhatsApp, Email, SMS, and Smart Gateway Backoff with simulated conversion curves.
   - **`Log`**: Persists a step-by-step explainability trace in SQLite for complete auditing.

2. **Synthetic Data Engine**:
   - Generates realistic payment scenarios with Indian customer personas, ₹ (INR) amounts, subscription tiers, and edge cases.
   - Scenario presets: *Mixed SaaS & Retail*, *High Subscription Churn*, *E-Commerce Checkout Drop-offs*, *B2B Overdue Invoices*, *Risk/Fraud Anomalies*.

3. **Modern Dark-Mode Dashboard**:
   - **Executive KPI Cards**: Real-time Total at Risk, Recovered Revenue, Recovery Rate %, Escalations.
   - **Recharts Analytics**: 5-step funnel conversion and failure catalog breakdown.
   - **Events Ledger**: Filterable, searchable live table with retry counters and 1-click run actions.
   - **Explainability Drawer**: Slide-out timeline with step-by-step reasoning, rules checked, and copy previews.
   - **Exceptions Desk (Human-in-the-Loop)**: Operator hub for manual settlements, debt write-offs, or retry limit overrides.

---

## 🏗️ Architecture

```
                                      ┌──────────────────────────────────────────────────────────┐
                                      │                      Recovery AI                         │
                                      └──────────────────────────────────────────────────────────┘
                                                                    │
           ┌────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┐
           ▼                                                        ▼                                                        ▼
┌─────────────────────────┐                             ┌─────────────────────────┐                              ┌─────────────────────────┐
│     Synthetic Engine    │                             │     FastAPI Backend     │                              │   Next.js / React UI    │
│  - Pandas + Faker       │ ──[ Generates Batches ]──►  │  - REST API Endpoints   │ ◄──[ REST API & SSE/Stream ]──│  - Executive KPI Cards  │
│  - 5 Scenario Presets   │                             │  - SQLite Database      │                              │  - Batch Runner & Stats │
│  - Edge Cases & Personas│                             │  - Agent Runner Service │                              │  - Funnel & Analytics   │
└─────────────────────────┘                             └─────────────────────────┘                              │  - Explainability Trace │
                                                                    │                                            │  - Exceptions Hub       │
                                                                    ▼                                            │  - Multi-lingual Copy   │
                                                        ┌─────────────────────────┐                              └─────────────────────────┘
                                                        │   LangGraph Agent Core  │
                                                        │                         │
                                                        │ 1. [Detect Node]        │
                                                        │    Scan pending events  │
                                                        │           │             │
                                                        │ 2. [Diagnose Node]      │
                                                        │    LLM Root-Cause       │
                                                        │           │             │
                                                        │ 3. [Decide / Policy]    │
                                                        │    Bounded Guardrails   │
                                                        │    (Max 3 retries, etc) │
                                                        │           │             │
                                                        │ 4. [Act Node (Mocked)]  │
                                                        │    Simulate dispatch    │
                                                        │           │             │
                                                        │ 5. [Log Node]           │
                                                        │    Audit trail in DB    │
                                                        └─────────────────────────┘
```

---

## 🛠️ Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000` (Interactive Swagger Docs at `http://localhost:8000/docs`).

### 2. Start Frontend UI
```bash
cd frontend
npm install
npm run dev
```
Frontend Dashboard will open at: `http://localhost:5173`.

### 3. Run Backend Unit & Integration Tests
```bash
cd backend
python -m pytest tests/test_agent.py -v
```

---

## 🛡️ Bounded Policy Engine Matrix

| Failure Reason | Direct Charge Allowed? | Autonomous Intervention Route | Guardrail Rationale |
|---|---|---|---|
| `expired_card` | ❌ No | Instant Card Update Link (Email/WhatsApp) | Prevents gateway decline penalties |
| `insufficient_funds` | ❌ No (Immediate) | Payday Scheduled Retry + Balance Reminder | Prevents overdraft irritation |
| `network_error` | ✅ Yes (Backoff) | Smart Exponential Backoff Route | Transient gateway timeout recovery |
| `cart_abandoned` | N/A | 10% Discount Incentive Outreach | Re-ignites purchase intent |
| `invoice_overdue` | N/A | Dunning Notice / UPI Direct Link | Polite commercial reminder |
| `fraud_flag` | ❌ Strictly Prohibited | Quarantined to Exceptions Desk | Anti-fraud compliance hold |
| `retries >= 3` | ❌ Strictly Prohibited | Escalated to Human Operations Desk | Prevents runaway billing loops |

---

## 📄 License
MIT License
