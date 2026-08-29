import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from database import init_db, SessionLocal, PaymentEvent, AgentLog
from generator import generate_event, generate_batch
from agent.graph import run_agent_on_event
from main import app

client = TestClient(app)


def test_generator_mixed_batch():
    batch = generate_batch(count=15, scenario="mixed")
    assert len(batch) == 15
    for item in batch:
        assert item["id"].startswith("evt_")
        assert item["amount"] > 0
        assert item["currency"] == "INR"
        assert item["failure_reason"] in [
            "insufficient_funds", "expired_card", "network_error",
            "cart_abandoned", "invoice_overdue", "fraud_flag", "invalid_vpa"
        ]


def test_guardrail_max_retries():
    """Verify that an event with >= 3 retries is escalated by the policy engine and not charged directly."""
    event = generate_event(scenario="high_churn", retry_count=3)
    result = run_agent_on_event(event)

    assert result["policy_status"] == "ESCALATED_MAX_RETRY"
    assert "RULE_MAX_RETRIES_EXCEEDED" in result["guardrails_violated"][0]
    assert result["final_status"] == "escalated"
    assert result["recovered_amount"] == 0.0


def test_guardrail_fraud_flag():
    """Verify that fraud flagged transactions are quarantined."""
    event = generate_event(custom_reason="fraud_flag", retry_count=0)
    result = run_agent_on_event(event)

    assert result["policy_status"] == "FRAUD_HOLD"
    assert "RULE_FRAUD_RISK_SHIELD" in result["guardrails_violated"][0]
    assert result["final_status"] == "escalated"


def test_guardrail_expired_card_no_direct_charge():
    """Verify that expired cards are never directly charged without sending an update link."""
    event = generate_event(custom_type="failed_payment", custom_reason="expired_card", retry_count=0)
    result = run_agent_on_event(event)

    assert result["policy_action"] == "send_update_card_link"
    assert result["communication_payload"]["action_link"] is not None
    assert "update" in result["communication_payload"]["action_link"]
    # Check Hinglish copy generated
    assert "expire" in result["communication_payload"]["hinglish_copy"]


def test_langgraph_5_step_audit_trail():
    """Verify that all 5 state machine steps are logged."""
    event = generate_event(scenario="checkout_dropoffs", retry_count=0)
    result = run_agent_on_event(event)

    steps = [log["step"] for log in result["trace_logs"]]
    assert "detect" in steps
    assert "diagnose" in steps
    assert "decide" in steps
    assert "act" in steps
    assert "log" in steps


def test_fastapi_endpoints_workflow():
    # 1. Reset
    r_reset = client.post("/api/reset")
    assert r_reset.status_code == 200

    # 2. Generate batch
    r_gen = client.post("/api/generate-batch", json={"count": 10, "scenario": "mixed"})
    assert r_gen.status_code == 200
    data = r_gen.json()
    assert data["count"] == 10

    # 3. Check events list
    r_events = client.get("/api/events")
    assert r_events.status_code == 200
    events_data = r_events.json()
    assert events_data["total"] == 10

    # 4. Check initial metrics
    r_metrics = client.get("/api/metrics")
    assert r_metrics.status_code == 200
    m_data = r_metrics.json()
    assert m_data["total_events"] == 10
    assert m_data["status_counts"]["pending"] == 10

    # 5. Run agent on pending batch
    r_run = client.post("/api/run-agent", json={"limit": 10})
    assert r_run.status_code == 200
    run_data = r_run.json()
    assert run_data["processed_count"] == 10

    # 6. Check updated metrics
    r_metrics2 = client.get("/api/metrics")
    m_data2 = r_metrics2.json()
    assert m_data2["status_counts"]["pending"] < 10

    # 7. Check audit trail on first event
    evt_id = data["event_ids"][0]
    r_trail = client.get(f"/api/events/{evt_id}/audit-trail")
    assert r_trail.status_code == 200
    trail_data = r_trail.json()
    assert len(trail_data["audit_logs"]) >= 5
