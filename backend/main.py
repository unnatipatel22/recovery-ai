import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import init_db, get_db, PaymentEvent, AgentLog
from generator import generate_batch, generate_event
from agent.graph import run_agent_on_event

# Initialize database schema
init_db()

app = FastAPI(
    title="Recovery AI API",
    description="Autonomous Revenue Recovery Agent Backend",
    version="1.0.0"
)

# Enable CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request & Response Models ---

class GenerateBatchRequest(BaseModel):
    count: int = Field(default=25, ge=1, le=200)
    scenario: str = Field(default="mixed")  # mixed, high_churn, checkout_dropoffs, b2b_invoices, fraud_anomalies


class RunAgentRequest(BaseModel):
    event_id: Optional[str] = None  # If provided, runs only for this event
    limit: Optional[int] = Field(default=50, ge=1, le=500)


class ResolveEventRequest(BaseModel):
    resolution_action: str  # manual_settled, write_off, reattempt_approved
    operator_notes: str


# --- Helper Methods ---

def _process_single_event(event: PaymentEvent, db: Session) -> Dict[str, Any]:
    event_dict = event.to_dict()
    result = run_agent_on_event(event_dict)

    # Update event state
    event.status = result["final_status"]
    if result["final_status"] != "pending":
        event.retry_count += 1
    event.updated_at = datetime.now(timezone.utc)

    # Save detailed agent logs
    for log_item in result.get("trace_logs", []):
        log_entry = AgentLog(
            event_id=event.id,
            step=log_item["step"],
            reasoning=log_item["reasoning"],
            action_taken=log_item.get("action_taken"),
            policy_check=log_item.get("policy_check"),
            outcome=log_item.get("outcome"),
            recovered_amount=log_item.get("recovered_amount", 0.0),
            payload_preview=log_item.get("payload_preview"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(log_entry)

    db.commit()
    db.refresh(event)
    return result


# --- API Routes ---

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat(), "service": "Recovery AI Agent Engine"}


@app.post("/api/generate-batch")
def create_batch(req: GenerateBatchRequest, db: Session = Depends(get_db)):
    events_data = generate_batch(count=req.count, scenario=req.scenario)
    created_events = []
    
    for item in events_data:
        event = PaymentEvent(
            id=item["id"],
            user_id=item["user_id"],
            customer_name=item["customer_name"],
            customer_email=item["customer_email"],
            customer_phone=item["customer_phone"],
            amount=item["amount"],
            currency=item["currency"],
            event_type=item["event_type"],
            failure_reason=item["failure_reason"],
            retry_count=item["retry_count"],
            status="pending",
            timestamp=item["timestamp"],
            metadata_json=item["metadata_json"],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(event)
        created_events.append(item["id"])

    db.commit()
    return {
        "success": True,
        "count": len(created_events),
        "scenario": req.scenario,
        "event_ids": created_events
    }


@app.get("/api/events")
def get_events(
    status: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(PaymentEvent)

    if status and status != "all":
        query = query.filter(PaymentEvent.status == status)

    if event_type and event_type != "all":
        query = query.filter(PaymentEvent.event_type == event_type)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (PaymentEvent.customer_name.ilike(search_fmt)) |
            (PaymentEvent.customer_email.ilike(search_fmt)) |
            (PaymentEvent.id.ilike(search_fmt)) |
            (PaymentEvent.failure_reason.ilike(search_fmt))
        )

    total = query.count()
    events = query.order_by(desc(PaymentEvent.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "events": [e.to_dict() for e in events]
    }


@app.get("/api/events/{event_id}")
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    event = db.query(PaymentEvent).filter(PaymentEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    logs = db.query(AgentLog).filter(AgentLog.event_id == event_id).order_by(AgentLog.id).all()
    event_data = event.to_dict()
    event_data["logs"] = [log.to_dict() for log in logs]
    return event_data


@app.get("/api/events/{event_id}/audit-trail")
def get_audit_trail(event_id: str, db: Session = Depends(get_db)):
    event = db.query(PaymentEvent).filter(PaymentEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    logs = db.query(AgentLog).filter(AgentLog.event_id == event_id).order_by(AgentLog.id).all()
    return {
        "event": event.to_dict(),
        "audit_logs": [log.to_dict() for log in logs]
    }


@app.post("/api/run-agent")
def trigger_agent_run(req: RunAgentRequest, db: Session = Depends(get_db)):
    if req.event_id:
        event = db.query(PaymentEvent).filter(PaymentEvent.id == req.event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        result = _process_single_event(event, db)
        return {
            "success": True,
            "processed_count": 1,
            "results": [{
                "event_id": event.id,
                "final_status": result["final_status"],
                "recovered_amount": result["recovered_amount"],
                "action_type": result.get("action_type")
            }]
        }
    
    # Process batch of pending events
    pending_events = db.query(PaymentEvent).filter(PaymentEvent.status == "pending").limit(req.limit).all()
    processed_results = []
    
    for event in pending_events:
        res = _process_single_event(event, db)
        processed_results.append({
            "event_id": event.id,
            "final_status": res["final_status"],
            "recovered_amount": res["recovered_amount"],
            "action_type": res.get("action_type")
        })

    return {
        "success": True,
        "processed_count": len(processed_results),
        "results": processed_results
    }


@app.post("/api/events/{event_id}/resolve")
def resolve_escalated_event(event_id: str, req: ResolveEventRequest, db: Session = Depends(get_db)):
    event = db.query(PaymentEvent).filter(PaymentEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if req.resolution_action == "manual_settled":
        event.status = "recovered"
        rec_amt = event.amount
        notes = f"Operator manually confirmed payment settlement. Notes: {req.operator_notes}"
    elif req.resolution_action == "write_off":
        event.status = "failed"
        rec_amt = 0.0
        notes = f"Operator marked as bad debt / written off. Notes: {req.operator_notes}"
    else:  # reattempt_approved
        event.status = "pending"
        event.retry_count = 0  # reset for fresh attempt
        rec_amt = 0.0
        notes = f"Operator approved retry reset. Notes: {req.operator_notes}"

    event.updated_at = datetime.now(timezone.utc)

    # Add audit log for manual intervention
    db.add(AgentLog(
        event_id=event.id,
        step="manual_override",
        reasoning=notes,
        action_taken=f"MANUAL_{req.resolution_action.upper()}",
        policy_check="HUMAN_IN_THE_LOOP_OVERRIDE",
        outcome="RESOLVED",
        recovered_amount=rec_amt,
        payload_preview=json.dumps({"operator_action": req.resolution_action, "notes": req.operator_notes}),
        created_at=datetime.now(timezone.utc)
    ))

    db.commit()
    return {"success": True, "event": event.to_dict()}


@app.get("/api/metrics")
def get_metrics(db: Session = Depends(get_db)):
    events = db.query(PaymentEvent).all()
    total_events = len(events)
    
    if total_events == 0:
        return {
            "total_events": 0,
            "total_at_risk": 0.0,
            "total_recovered": 0.0,
            "recovery_rate_pct": 0.0,
            "status_counts": {"pending": 0, "recovered": 0, "failed": 0, "escalated": 0, "blocked": 0},
            "reason_counts": {},
            "event_type_counts": {},
            "funnel": {
                "detected": 0,
                "diagnosed": 0,
                "policy_approved": 0,
                "recovered": 0,
                "escalated": 0
            }
        }

    total_at_risk = sum(e.amount for e in events)
    recovered_events = [e for e in events if e.status == "recovered"]
    total_recovered = sum(e.amount for e in recovered_events)
    recovery_rate = (total_recovered / total_at_risk * 100) if total_at_risk > 0 else 0.0

    status_counts = {
        "pending": sum(1 for e in events if e.status == "pending"),
        "recovered": len(recovered_events),
        "failed": sum(1 for e in events if e.status == "failed"),
        "escalated": sum(1 for e in events if e.status == "escalated"),
        "blocked": sum(1 for e in events if e.status == "blocked"),
    }

    reason_counts = {}
    for e in events:
        reason_counts[e.failure_reason] = reason_counts.get(e.failure_reason, 0) + 1

    event_type_counts = {}
    for e in events:
        event_type_counts[e.event_type] = event_type_counts.get(e.event_type, 0) + 1

    # Funnel steps based on logs and statuses
    diagnosed_count = db.query(func.count(func.distinct(AgentLog.event_id))).filter(AgentLog.step == "diagnose").scalar() or 0
    decided_count = db.query(func.count(func.distinct(AgentLog.event_id))).filter(AgentLog.step == "decide").scalar() or 0

    return {
        "total_events": total_events,
        "total_at_risk": round(total_at_risk, 2),
        "total_recovered": round(total_recovered, 2),
        "recovery_rate_pct": round(recovery_rate, 1),
        "status_counts": status_counts,
        "reason_counts": reason_counts,
        "event_type_counts": event_type_counts,
        "funnel": {
            "detected": total_events,
            "diagnosed": diagnosed_count,
            "policy_approved": decided_count,
            "recovered": status_counts["recovered"],
            "escalated": status_counts["escalated"]
        }
    }


@app.post("/api/reset")
def reset_database(db: Session = Depends(get_db)):
    db.query(AgentLog).delete()
    db.query(PaymentEvent).delete()
    db.commit()
    return {"success": True, "message": "Database reset to empty state"}
