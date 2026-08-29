import os
import json
import random
from typing import Dict, Any, List, Optional, TypedDict
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# LangGraph imports
from langgraph.graph import StateGraph, END


class RecoveryAgentState(TypedDict):
    event_id: str
    user_id: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    amount: float
    currency: str
    event_type: str
    failure_reason: str
    retry_count: int
    metadata: Dict[str, Any]

    # Node outputs
    detect_status: str
    detect_notes: str

    diagnosis_root_cause: str
    diagnosis_sensitivity: str
    diagnosis_recommended_action: str
    diagnosis_reasoning: str
    is_llm_powered: bool

    policy_status: str  # APPROVED, BLOCKED_OUT_OF_POLICY, ESCALATED_MAX_RETRY, FRAUD_HOLD
    policy_action: str
    policy_explanation: str
    guardrails_passed: List[str]
    guardrails_violated: List[str]

    act_outcome: str  # RECOVERED, SCHEDULED, ESCALATED, BLOCKED, FAILED
    recovered_amount: float
    action_type: str
    communication_payload: Dict[str, Any]

    final_status: str
    trace_logs: List[Dict[str, Any]]


# --- Fallback & Anthropic LLM Reasoning Engine ---

def _generate_llm_diagnosis(state: RecoveryAgentState) -> Dict[str, Any]:
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
    
    prompt = f"""
You are Recovery AI, an autonomous revenue recovery diagnostic engine.
Diagnose this revenue-at-risk event:
- Customer: {state['customer_name']} (Email: {state['customer_email']}, Phone: {state.get('customer_phone')})
- Event Type: {state['event_type']}
- Amount: ₹{state['amount']}
- Failure Reason: {state['failure_reason']}
- Past Retry Count: {state['retry_count']}
- Metadata: {json.dumps(state.get('metadata', {}))}

Provide diagnostic output in JSON with:
1. "root_cause": Clear explanation of why the revenue is blocked.
2. "customer_sensitivity": "low" | "medium" | "high" | "critical"
3. "recommended_action": Primary recommendation (e.g., send_update_card_link, schedule_payday_retry, smart_backoff_retry, send_discount_incentive, send_dunning_notice, manual_fraud_review)
4. "reasoning": 2-3 sentences of natural language reasoning behind the recovery strategy.
Return ONLY valid JSON.
"""

    if api_key and api_key.startswith("sk-"):
        try:
            from langchain_anthropic import ChatAnthropic
            llm = ChatAnthropic(model="claude-3-5-sonnet-20241022", anthropic_api_key=api_key, temperature=0.2)
            response = llm.invoke(prompt)
            content = response.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            data = json.loads(content)
            data["is_llm_powered"] = True
            return data
        except Exception:
            pass

    # Built-in intelligent heuristic engine (guaranteed high-quality output out of the box)
    reason = state["failure_reason"]
    event_type = state["event_type"]
    name = state["customer_name"]
    amount = state["amount"]
    retries = state["retry_count"]

    if reason == "expired_card":
        return {
            "root_cause": "The customer's credit/debit card on file has expired, causing subscription auto-billing to fail.",
            "customer_sensitivity": "low" if amount < 3000 else "medium",
            "recommended_action": "send_update_card_link",
            "reasoning": f"Card on file for {name} has expired. Repeated automated charge retries will only cause further gateway declines and hurt merchant reputation. The safest autonomous recovery step is dispatching an instant secure 1-click card update link via Email & WhatsApp.",
            "is_llm_powered": False
        }
    elif reason == "insufficient_funds":
        return {
            "root_cause": "Card/Bank declined due to temporary insufficient balance at the time of renewal trigger.",
            "customer_sensitivity": "medium",
            "recommended_action": "schedule_payday_retry",
            "reasoning": f"Customer {name} encountered a soft decline due to balance unavailability. An immediate repeat charge risks irritating the user and incurring overdraft charges. We recommend scheduling an intelligent retry aligned with month-end/payday cycles plus a subtle WhatsApp balance reminder.",
            "is_llm_powered": False
        }
    elif reason == "network_error":
        return {
            "root_cause": "Transient banking gateway timeout / handshake interruption during 3D Secure / UPI authorization.",
            "customer_sensitivity": "low",
            "recommended_action": "smart_backoff_retry",
            "reasoning": f"This is a transient network/gateway hiccup with no fundamental user insolvency. An autonomous retry with exponential backoff (scheduled in 30 minutes) has a >90% probability of successful capture without disturbing {name}.",
            "is_llm_powered": False
        }
    elif reason == "cart_abandoned":
        return {
            "root_cause": "High-intent buyer dropped off at the payment selection stage without completing the transaction.",
            "customer_sensitivity": "high",
            "recommended_action": "send_discount_incentive",
            "reasoning": f"Shopper {name} showed high checkout intent for ₹{amount:,.2f}. To recover the cart before intent decays, dispatch a personalized reminder with a time-limited 10% instant checkout incentive.",
            "is_llm_powered": False
        }
    elif reason == "invoice_overdue":
        return {
            "root_cause": f"B2B Net-terms payment overdue. Outstanding balance of ₹{amount:,.2f}.",
            "customer_sensitivity": "high" if amount > 30000 else "medium",
            "recommended_action": "send_dunning_notice" if retries < 2 else "escalate_account_manager",
            "reasoning": f"Commercial invoice for {name} is overdue. Standard polite dunning cycle with instant UPI/NEFT one-click payment link is appropriate for early notices; escalation required if past 2 unacknowledged reminders.",
            "is_llm_powered": False
        }
    elif reason == "fraud_flag":
        return {
            "root_cause": "Risk engine flagged transaction for anomalous geo-velocity or suspicious pattern.",
            "customer_sensitivity": "critical",
            "recommended_action": "manual_fraud_review",
            "reasoning": "Transaction triggered security anti-fraud heuristics. Automated retry is strictly unsafe and violates compliance standards. Immediate escalation to human risk ops required.",
            "is_llm_powered": False
        }
    elif reason == "invalid_vpa":
        return {
            "root_cause": "Customer's UPI Virtual Payment Address (VPA) is invalid or deregistered.",
            "customer_sensitivity": "low",
            "recommended_action": "send_vpa_update_prompt",
            "reasoning": f"UPI mandate failed because the provided UPI handle is inactive. Sending an SMS/WhatsApp prompt asking {name} to update their UPI ID.",
            "is_llm_powered": False
        }
    else:
        return {
            "root_cause": f"General payment decline under category: {reason}.",
            "customer_sensitivity": "medium",
            "recommended_action": "smart_backoff_retry",
            "reasoning": f"Automated intervention analyzing general payment decline for ₹{amount}.",
            "is_llm_powered": False
        }


# --- Multi-lingual Message Copy Generator (English & Hinglish) ---

def _generate_communication_payload(state: RecoveryAgentState, action: str) -> Dict[str, Any]:
    name = state["customer_name"]
    amount = f"₹{state['amount']:,.2f}"
    reason = state["failure_reason"]
    meta = state.get("metadata", {})
    plan = meta.get("subscription_plan", "Active Plan")
    items = meta.get("cart_items", "Selected items in your cart")
    inv_num = meta.get("invoice_number", "INV-2026")

    if action == "send_update_card_link":
        return {
            "channel": "Email & WhatsApp",
            "subject": f"Action Required: Update payment method for {plan}",
            "english_copy": f"Hi {name},\n\nWe were unable to renew your {plan} subscription ({amount}) because your payment card has expired. To prevent any service disruption, please update your card details securely here: https://pay.recoveryai.in/update/{state['event_id']}\n\nThanks,\nBilling Team",
            "hinglish_copy": f"Namaste {name} ji,\n\nAapke {plan} subscription ({amount}) ka payment card expire hone ki wajah se complete nahi ho paya. Services bina ruke chalti rahein, iske liye kripya apna card yahan update karein: https://pay.recoveryai.in/update/{state['event_id']}\n\nDhanyawad,\nBilling Team",
            "action_link": f"https://pay.recoveryai.in/update/{state['event_id']}"
        }
    elif action == "schedule_payday_retry":
        return {
            "channel": "WhatsApp & In-App Notice",
            "subject": f"Reminder: Upcoming renewal for {plan}",
            "english_copy": f"Hi {name},\n\nYour subscription renewal for {plan} ({amount}) was unsuccessful due to insufficient funds. We've scheduled a retry for you in a few days. You can also pay directly anytime: https://pay.recoveryai.in/retry/{state['event_id']}",
            "hinglish_copy": f"Namaste {name},\n\nAapke {plan} renewal ({amount}) mein insufficient balance ka issue aaya tha. Humne aapka retry schedule kar diya hai. Aap chahein toh abhi bhi pay kar sakte hain: https://pay.recoveryai.in/retry/{state['event_id']}",
            "action_link": f"https://pay.recoveryai.in/retry/{state['event_id']}"
        }
    elif action == "smart_backoff_retry":
        return {
            "channel": "Automated Gateway Dispatch",
            "subject": "System Automated Retry",
            "english_copy": f"[Autonomous Agent] Dispatched smart retry via secondary gateway route with 15m exponential backoff for {amount}.",
            "hinglish_copy": f"[Autonomous Agent] System ne backoff delay ke sath secondary payment route se retry trigger kar diya hai ({amount}).",
            "action_link": None
        }
    elif action == "send_discount_incentive":
        return {
            "channel": "WhatsApp & Push Notification",
            "subject": "Did you leave something behind? Here's 10% OFF!",
            "english_copy": f"Hi {name} 👋\n\nYou left {items} ({amount}) in your cart! Complete your order within the next 2 hours and get an instant 10% discount with code RECOVER10: https://shop.recoveryai.in/cart/{state['event_id']}",
            "hinglish_copy": f"Namaste {name} 👋\n\nAapka cart wait kar raha hai: {items} ({amount}). Agle 2 ghante mein checkout complete karein aur payein FLAT 10% OFF coupon code 'RECOVER10' ke sath: https://shop.recoveryai.in/cart/{state['event_id']}",
            "action_link": f"https://shop.recoveryai.in/cart/{state['event_id']}?code=RECOVER10"
        }
    elif action == "send_dunning_notice":
        return {
            "channel": "Official Business Email & SMS",
            "subject": f"Statement of Account: Invoice {inv_num} is Overdue",
            "english_copy": f"Dear {name},\n\nThis is a friendly reminder that Invoice {inv_num} for {amount} is currently overdue. Please arrange settlement via our instant B2B payment portal: https://b2b.recoveryai.in/pay/{inv_num}\n\nRegards,\nFinance Operations",
            "hinglish_copy": f"Namaste {name},\n\nAapke business invoice {inv_num} ({amount}) ki payment overdue hai. Kripya diye gaye portal link se payment complete karein: https://b2b.recoveryai.in/pay/{inv_num}\n\nDhanyawad,\nFinance Operations",
            "action_link": f"https://b2b.recoveryai.in/pay/{inv_num}"
        }
    elif action == "send_vpa_update_prompt":
        return {
            "channel": "SMS & WhatsApp",
            "subject": "Update your UPI ID to continue subscription",
            "english_copy": f"Hi {name},\n\nYour UPI Autopay for {plan} ({amount}) could not connect. Please update your UPI ID here: https://pay.recoveryai.in/upi/{state['event_id']}",
            "hinglish_copy": f"Namaste {name},\n\nAapka UPI handle connect nahi ho paya. Kripya apna valid UPI ID yahan update karein: https://pay.recoveryai.in/upi/{state['event_id']}",
            "action_link": f"https://pay.recoveryai.in/upi/{state['event_id']}"
        }
    else:
        return {
            "channel": "Internal Ops Escalation",
            "subject": f"Manual Intervention Required: {state['event_id']}",
            "english_copy": f"Event {state['event_id']} requires human operator review. Failure reason: {reason}, past retries: {state['retry_count']}.",
            "hinglish_copy": f"Event {state['event_id']} ko manual review ke liye queue kiya gaya hai. Reason: {reason}.",
            "action_link": None
        }


# --- LangGraph Nodes ---

def detect_node(state: RecoveryAgentState) -> Dict[str, Any]:
    """Step 1: Detect and ingest the revenue-at-risk event."""
    logs = state.get("trace_logs", [])
    
    retry_count = state["retry_count"]
    event_id = state["event_id"]
    
    notes = f"Detected {state['event_type']} event {event_id} for customer {state['customer_name']} (Amount: ₹{state['amount']:,.2f}). Current retry counter: {retry_count}."
    
    logs.append({
        "step": "detect",
        "reasoning": notes,
        "action_taken": "INGEST_EVENT",
        "policy_check": "PASSED",
        "outcome": "DETECTED",
        "recovered_amount": 0.0,
        "payload_preview": json.dumps({"status": "ingested", "event_id": event_id, "amount": state["amount"]})
    })

    return {
        "detect_status": "READY",
        "detect_notes": notes,
        "trace_logs": logs
    }


def diagnose_node(state: RecoveryAgentState) -> Dict[str, Any]:
    """Step 2: LLM Root-Cause Analysis and classification."""
    logs = state.get("trace_logs", [])
    diagnosis = _generate_llm_diagnosis(state)
    
    engine_label = "Claude 3.5 Sonnet" if diagnosis.get("is_llm_powered") else "Intelligent Heuristic LLM Engine"
    reasoning_summary = f"[{engine_label}] Root Cause: {diagnosis['root_cause']} | Sensitivity: {diagnosis['customer_sensitivity'].upper()} | Recommended: {diagnosis['recommended_action']}. Reasoning: {diagnosis['reasoning']}"
    
    logs.append({
        "step": "diagnose",
        "reasoning": reasoning_summary,
        "action_taken": f"DIAGNOSED_{diagnosis['recommended_action'].upper()}",
        "policy_check": "PENDING_POLICY",
        "outcome": "DIAGNOSED",
        "recovered_amount": 0.0,
        "payload_preview": json.dumps(diagnosis)
    })

    return {
        "diagnosis_root_cause": diagnosis["root_cause"],
        "diagnosis_sensitivity": diagnosis["customer_sensitivity"],
        "diagnosis_recommended_action": diagnosis["recommended_action"],
        "diagnosis_reasoning": diagnosis["reasoning"],
        "is_llm_powered": diagnosis.get("is_llm_powered", False),
        "trace_logs": logs
    }


def decide_node(state: RecoveryAgentState) -> Dict[str, Any]:
    """Step 3: Bounded Policy Engine and Guardrails."""
    logs = state.get("trace_logs", [])
    recommended = state["diagnosis_recommended_action"]
    failure_reason = state["failure_reason"]
    retry_count = state["retry_count"]
    
    passed_rules = []
    violated_rules = []
    
    # Guardrail 1: Max 3 retries limit
    if retry_count >= 3:
        violated_rules.append("RULE_MAX_RETRIES_EXCEEDED (Max 3 attempts permitted)")
        policy_status = "ESCALATED_MAX_RETRY"
        policy_action = "escalate_human_review"
        explanation = f"Event has already undergone {retry_count} previous recovery attempts. Autonomous retry limit of 3 exceeded. Escalating to human team to protect merchant reputation."
    
    # Guardrail 2: Anti-Fraud & Risk Hold
    elif failure_reason == "fraud_flag" or recommended == "manual_fraud_review":
        violated_rules.append("RULE_FRAUD_RISK_SHIELD (No autonomous charge on fraud flag)")
        policy_status = "FRAUD_HOLD"
        policy_action = "escalate_fraud_team"
        explanation = "High risk security anomaly flagged. Automated retries strictly prohibited. Account frozen for risk officer review."
    
    # Guardrail 3: Expired Card Rule (No direct re-charges without user updating credentials)
    elif failure_reason == "expired_card" and "retry" in recommended:
        violated_rules.append("RULE_EXPIRED_CARD_NO_CHARGE (Direct charge prohibited on expired card)")
        policy_status = "APPROVED_WITH_POLICY_MODIFICATION"
        policy_action = "send_update_card_link"
        passed_rules.append("POLICY_SUBSTITUTION: Switched direct retry to secure card update link.")
        explanation = "Prevented direct card charge on expired card; bounded policy routed to Customer Update Link."
    
    # Guardrail 4: Standard Approved Interventions
    else:
        passed_rules.append("RULE_WITHIN_RETRY_LIMIT (Attempts < 3)")
        passed_rules.append("RULE_NON_DESTRUCTIVE_INTERVENTION (Safe communication / smart backoff)")
        policy_status = "APPROVED"
        policy_action = recommended
        explanation = f"Autonomous intervention '{policy_action}' is fully compliant with bounded recovery rules."

    logs.append({
        "step": "decide",
        "reasoning": f"Policy Status: {policy_status} | Action: {policy_action} | {explanation}",
        "action_taken": f"POLICY_{policy_status}",
        "policy_check": policy_status,
        "outcome": "DECIDED",
        "recovered_amount": 0.0,
        "payload_preview": json.dumps({
            "status": policy_status,
            "chosen_action": policy_action,
            "passed_rules": passed_rules,
            "violated_rules": violated_rules,
            "explanation": explanation
        })
    })

    return {
        "policy_status": policy_status,
        "policy_action": policy_action,
        "policy_explanation": explanation,
        "guardrails_passed": passed_rules,
        "guardrails_violated": violated_rules,
        "trace_logs": logs
    }


def act_node(state: RecoveryAgentState) -> Dict[str, Any]:
    """Step 4: Execute mocked intervention and calculate recovery outcome."""
    logs = state.get("trace_logs", [])
    action = state["policy_action"]
    policy_status = state["policy_status"]
    amount = state["amount"]
    
    # Generate multi-lingual message previews
    comms_payload = _generate_communication_payload(state, action)
    
    # Realistic outcome simulation based on action type and state
    if policy_status in ["ESCALATED_MAX_RETRY", "FRAUD_HOLD"]:
        act_outcome = "ESCALATED"
        recovered_amount = 0.0
        final_status = "escalated"
        reasoning = f"Intervention safely halted and transferred to Human Operations Queue: {state['policy_explanation']}"
    
    elif action == "smart_backoff_retry":
        # 88% chance of immediate recovery on transient network errors
        success = random.random() < 0.88
        if success:
            act_outcome = "RECOVERED"
            recovered_amount = amount
            final_status = "recovered"
            reasoning = f"Smart exponential backoff retry succeeded on secondary gateway route. Captured ₹{amount:,.2f}."
        else:
            act_outcome = "FAILED"
            recovered_amount = 0.0
            final_status = "failed"
            reasoning = "Secondary gateway retry also timed out. Queued for next scheduled window."

    elif action in ["send_update_card_link", "send_discount_incentive", "send_vpa_update_prompt"]:
        # 75% customer conversion rate upon receiving instant link
        success = random.random() < 0.75
        if success:
            act_outcome = "RECOVERED"
            recovered_amount = amount
            final_status = "recovered"
            reasoning = f"Customer clicked interactive recovery link and successfully completed payment of ₹{amount:,.2f}."
        else:
            act_outcome = "PENDING_CUSTOMER_ACTION"
            recovered_amount = 0.0
            final_status = "pending"
            reasoning = "Outreach dispatched via WhatsApp/Email. Awaiting customer click & authorization."

    elif action == "schedule_payday_retry":
        act_outcome = "SCHEDULED"
        recovered_amount = 0.0
        final_status = "pending"
        reasoning = f"Balance reminder sent. Automated retry scheduled for upcoming payday window (Probable ₹{amount:,.2f} capture)."

    elif action == "send_dunning_notice":
        # 70% B2B response rate
        success = random.random() < 0.70
        if success:
            act_outcome = "RECOVERED"
            recovered_amount = amount
            final_status = "recovered"
            reasoning = f"B2B Finance team acknowledged dunning notice and cleared invoice for ₹{amount:,.2f} via NEFT/UPI."
        else:
            act_outcome = "PENDING_B2B_APPROVAL"
            recovered_amount = 0.0
            final_status = "pending"
            reasoning = "Dunning notice delivered with audit receipt. Awaiting AP approval."

    else:
        act_outcome = "ESCALATED"
        recovered_amount = 0.0
        final_status = "escalated"
        reasoning = "Action dispatched to manual resolution desk."

    logs.append({
        "step": "act",
        "reasoning": reasoning,
        "action_taken": f"ACT_{action.upper()}",
        "policy_check": policy_status,
        "outcome": act_outcome,
        "recovered_amount": recovered_amount,
        "payload_preview": json.dumps(comms_payload)
    })

    return {
        "act_outcome": act_outcome,
        "recovered_amount": recovered_amount,
        "action_type": action,
        "communication_payload": comms_payload,
        "final_status": final_status,
        "trace_logs": logs
    }


def log_node(state: RecoveryAgentState) -> Dict[str, Any]:
    """Step 5: Finalize state and wrap audit trace."""
    logs = state.get("trace_logs", [])
    
    summary = f"Audit trail finalized for event {state['event_id']}. Final Status: {state['final_status'].upper()} | Recovered: ₹{state['recovered_amount']:,.2f}."
    
    logs.append({
        "step": "log",
        "reasoning": summary,
        "action_taken": "COMMIT_AUDIT_LOG",
        "policy_check": state["policy_status"],
        "outcome": state["act_outcome"],
        "recovered_amount": state["recovered_amount"],
        "payload_preview": json.dumps({"final_status": state["final_status"], "trace_steps": len(logs)})
    })

    return {
        "trace_logs": logs
    }


# --- Build LangGraph State Graph ---

def build_recovery_graph():
    workflow = StateGraph(RecoveryAgentState)

    workflow.add_node("detect", detect_node)
    workflow.add_node("diagnose", diagnose_node)
    workflow.add_node("decide", decide_node)
    workflow.add_node("act", act_node)
    workflow.add_node("log", log_node)

    workflow.set_entry_point("detect")
    workflow.add_edge("detect", "diagnose")
    workflow.add_edge("diagnose", "decide")
    workflow.add_edge("decide", "act")
    workflow.add_edge("act", "log")
    workflow.add_edge("log", END)

    return workflow.compile()


# Global compiled graph instance
recovery_agent_graph = build_recovery_graph()


def run_agent_on_event(event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Executes the LangGraph recovery workflow on an event dictionary."""
    initial_state: RecoveryAgentState = {
        "event_id": event_dict["id"],
        "user_id": event_dict["user_id"],
        "customer_name": event_dict["customer_name"],
        "customer_email": event_dict["customer_email"],
        "customer_phone": event_dict.get("customer_phone"),
        "amount": float(event_dict["amount"]),
        "currency": event_dict.get("currency", "INR"),
        "event_type": event_dict["event_type"],
        "failure_reason": event_dict["failure_reason"],
        "retry_count": int(event_dict.get("retry_count", 0)),
        "metadata": event_dict.get("metadata", {}),
        
        "detect_status": "",
        "detect_notes": "",
        "diagnosis_root_cause": "",
        "diagnosis_sensitivity": "",
        "diagnosis_recommended_action": "",
        "diagnosis_reasoning": "",
        "is_llm_powered": False,
        "policy_status": "",
        "policy_action": "",
        "policy_explanation": "",
        "guardrails_passed": [],
        "guardrails_violated": [],
        "act_outcome": "",
        "recovered_amount": 0.0,
        "action_type": "",
        "communication_payload": {},
        "final_status": "pending",
        "trace_logs": []
    }

    result = recovery_agent_graph.invoke(initial_state)
    return result
