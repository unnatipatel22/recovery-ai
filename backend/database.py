import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Float,
    Integer,
    DateTime,
    Text,
    ForeignKey,
    desc
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

DATABASE_URL = "sqlite:///./recovery_ai.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    customer_name = Column(String(128), nullable=False)
    customer_email = Column(String(128), nullable=False)
    customer_phone = Column(String(32), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    event_type = Column(String(64), nullable=False)  # failed_payment, abandoned_checkout, overdue_invoice
    failure_reason = Column(String(64), nullable=False)  # insufficient_funds, expired_card, network_error, cart_abandoned, invoice_overdue, fraud_flag, invalid_vpa
    retry_count = Column(Integer, default=0, nullable=False)
    status = Column(String(32), default="pending", index=True, nullable=False)  # pending, recovered, failed, escalated, blocked
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    metadata_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    logs = relationship("AgentLog", back_populates="event", cascade="all, delete-orphan", order_by="AgentLog.id")

    def to_dict(self) -> Dict[str, Any]:
        meta = {}
        try:
            meta = json.loads(self.metadata_json) if self.metadata_json else {}
        except Exception:
            meta = {}

        return {
            "id": self.id,
            "user_id": self.user_id,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "customer_phone": self.customer_phone,
            "amount": self.amount,
            "currency": self.currency,
            "event_type": self.event_type,
            "failure_reason": self.failure_reason,
            "retry_count": self.retry_count,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metadata": meta,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), ForeignKey("payment_events.id"), index=True, nullable=False)
    step = Column(String(32), nullable=False)  # detect, diagnose, decide, act, log
    reasoning = Column(Text, nullable=False)
    action_taken = Column(String(64), nullable=True)
    policy_check = Column(String(64), nullable=True)  # APPROVED, BLOCKED_OUT_OF_POLICY, ESCALATED_MAX_RETRY, MANUAL_REVIEW
    outcome = Column(String(64), nullable=True)  # SUCCESS, RECOVERED, SCHEDULED, BLOCKED, FAILED, ESCALATED
    recovered_amount = Column(Float, default=0.0, nullable=False)
    payload_preview = Column(Text, nullable=True)  # JSON or text containing preview message & details
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    event = relationship("PaymentEvent", back_populates="logs")

    def to_dict(self) -> Dict[str, Any]:
        preview = None
        if self.payload_preview:
            try:
                preview = json.loads(self.payload_preview)
            except Exception:
                preview = {"raw": self.payload_preview}

        return {
            "id": self.id,
            "event_id": self.event_id,
            "step": self.step,
            "reasoning": self.reasoning,
            "action_taken": self.action_taken,
            "policy_check": self.policy_check,
            "outcome": self.outcome,
            "recovered_amount": self.recovered_amount,
            "payload_preview": preview,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
