import json
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from faker import Faker

fake = Faker("en_IN")

INDIAN_NAMES = [
    "Aarav Sharma", "Priya Patel", "Rohan Mehta", "Ananya Iyer",
    "Vikram Malhotra", "Sneha Rao", "Aditya Verma", "Pooja Deshmukh",
    "Rahul Nair", "Neha Kapoor", "Siddharth Gupta", "Kavya Reddy",
    "Arjun Mukherjee", "Divya Joshi", "Karan Singhal", "Tanvi Bhatia",
    "Manish Choudhary", "Ritu Saxena", "Naveen Bansal", "Shreya Sen",
    "Harsh Vardhan", "Deepika Agarwal", "Rajesh Nambiar", "Meera Kulkarni",
    "Amitabh Sengupta", "Simran Kaur", "Gaurav Trivedi", "Ishita Paul"
]

FAILURE_REASONS_CATALOG = {
    "failed_payment": [
        ("insufficient_funds", 0.35),
        ("expired_card", 0.25),
        ("network_error", 0.20),
        ("invalid_vpa", 0.10),
        ("fraud_flag", 0.10),
    ],
    "abandoned_checkout": [
        ("cart_abandoned", 0.70),
        ("network_error", 0.15),
        ("invalid_vpa", 0.15),
    ],
    "overdue_invoice": [
        ("invoice_overdue", 0.85),
        ("network_error", 0.15),
    ],
}


def _choose_failure_reason(event_type: str) -> str:
    choices, weights = zip(*FAILURE_REASONS_CATALOG[event_type])
    return random.choices(choices, weights=weights, k=1)[0]


def generate_event(
    scenario: str = "mixed",
    custom_type: str = None,
    custom_reason: str = None,
    retry_count: int = 0
) -> Dict[str, Any]:
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    name = random.choice(INDIAN_NAMES)
    first_name = name.split()[0].lower()
    email = f"{first_name}.{random.randint(10, 99)}@{random.choice(['gmail.com', 'outlook.com', 'company.in', 'techstart.io'])}"
    phone = f"+91 {random.choice(['98', '97', '99', '96', '91'])}{random.randint(10000000, 99999999)}"

    # Determine event type based on scenario
    if custom_type:
        event_type = custom_type
    elif scenario == "high_churn":
        event_type = "failed_payment"
    elif scenario == "checkout_dropoffs":
        event_type = "abandoned_checkout"
    elif scenario == "b2b_invoices":
        event_type = "overdue_invoice"
    elif scenario == "fraud_anomalies":
        event_type = "failed_payment"
    else:  # mixed
        event_type = random.choices(
            ["failed_payment", "abandoned_checkout", "overdue_invoice"],
            weights=[0.60, 0.25, 0.15],
            k=1
        )[0]

    # Determine failure reason
    if custom_reason:
        failure_reason = custom_reason
    elif scenario == "fraud_anomalies":
        failure_reason = "fraud_flag"
    elif scenario == "high_churn":
        failure_reason = random.choices(
            ["insufficient_funds", "expired_card", "network_error"],
            weights=[0.50, 0.35, 0.15],
            k=1
        )[0]
    else:
        failure_reason = _choose_failure_reason(event_type)

    # Determine amount & metadata
    metadata: Dict[str, Any] = {
        "customer_tier": random.choices(["free", "standard", "pro", "enterprise"], weights=[0.2, 0.5, 0.25, 0.05], k=1)[0],
        "lifetime_orders": random.randint(1, 45),
        "days_as_customer": random.randint(5, 750),
    }

    if event_type == "failed_payment":
        plan_name = random.choice(["Pro Monthly", "Starter Annual", "Growth Tier", "Enterprise Add-on", "Cloud Storage 1TB"])
        amount = round(random.choice([499.0, 999.0, 1499.0, 2499.0, 4999.0, 8999.0, 14999.0]), 2)
        metadata.update({
            "subscription_plan": plan_name,
            "card_last4": str(random.randint(1000, 9999)),
            "gateway": random.choice(["Razorpay", "Stripe", "Cashfree", "PayU"]),
            "gateway_error_code": f"ERR_{failure_reason.upper()}",
            "payment_method": random.choice(["credit_card", "debit_card", "upi_autopay"]),
        })
        if failure_reason == "expired_card":
            metadata["card_expiry"] = "07/26"  # past expiry
        elif failure_reason == "insufficient_funds":
            metadata["probable_salary_date"] = f"{random.choice([1, 5, 7, 30])}th of month"

    elif event_type == "abandoned_checkout":
        items = random.choice([
            "Noise Cancelling Headphones + Tech Sleeve",
            "Annual SaaS Developer Workspace (3 seats)",
            "Ergonomic Standing Desk Converter",
            "Smart Home Security Kit",
            "Mechanical Keyboard + Custom Keycaps"
        ])
        amount = round(random.uniform(1200.0, 18500.0), 2)
        metadata.update({
            "cart_items": items,
            "device": random.choice(["Mobile iOS", "Mobile Android", "Desktop Chrome", "Desktop Mac Safari"]),
            "session_duration_sec": random.randint(90, 800),
            "discount_eligible": True,
            "checkout_step": "payment_selection"
        })

    elif event_type == "overdue_invoice":
        company = f"{name.split()[1]} Technologies Pvt Ltd"
        amount = round(random.uniform(15000.0, 85000.0), 2)
        days_overdue = random.randint(7, 45)
        metadata.update({
            "company_name": company,
            "invoice_number": f"INV-2026-{random.randint(1000, 9999)}",
            "terms": random.choice(["Net 15", "Net 30", "Net 45"]),
            "days_overdue": days_overdue,
            "account_manager": random.choice(["Amit Shah", "Nisha Roy", "Kunal Kapoor"]),
        })

    # Set retry count and status
    if retry_count > 0:
        event_retry = retry_count
    else:
        # 15% chance of already having 1-2 past failed retries in synthetic batch
        event_retry = random.choices([0, 1, 2, 3], weights=[0.70, 0.18, 0.08, 0.04], k=1)[0]

    # Timestamp within last 72 hours
    event_time = datetime.now(timezone.utc) - timedelta(
        hours=random.randint(0, 72),
        minutes=random.randint(0, 59)
    )

    return {
        "id": event_id,
        "user_id": user_id,
        "customer_name": name,
        "customer_email": email,
        "customer_phone": phone,
        "amount": amount,
        "currency": "INR",
        "event_type": event_type,
        "failure_reason": failure_reason,
        "retry_count": event_retry,
        "status": "pending",
        "timestamp": event_time,
        "metadata_json": json.dumps(metadata)
    }


def generate_batch(count: int = 25, scenario: str = "mixed") -> List[Dict[str, Any]]:
    """Generates a batch of synthetic events."""
    return [generate_event(scenario=scenario) for _ in range(count)]
