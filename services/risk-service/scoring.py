import json
from datetime import datetime, timedelta
from typing import List


def compute_risk_score(account_id: str, current_balance: float, recent_transactions: List[dict]):
    score = 10
    flags = []

    # Check if any single transaction exceeds 50% of balance
    for txn in recent_transactions:
        txn_amount = txn.get("amount", 0)
        if txn_amount > current_balance * 0.5:
            score += 20
            flags.append(f"Large transaction: ₹{txn_amount:,.0f} exceeds 50% of balance")
            break

    # Check for rapid transactions (>= 3 in the last 60 minutes)
    now = datetime.utcnow()
    recent_count = 0
    for txn in recent_transactions:
        created_str = txn.get("created_at", "")
        try:
            if isinstance(created_str, str):
                created = datetime.fromisoformat(created_str.replace("Z", "+00:00")).replace(tzinfo=None)
            else:
                created = created_str
            if (now - created) <= timedelta(minutes=60):
                recent_count += 1
        except (ValueError, TypeError):
            continue

    if recent_count >= 3:
        score += 15
        flags.append(f"High frequency: {recent_count} transactions in the last 60 minutes")

    # Balance checks
    if current_balance < 50000:
        score += 10
        flags.append(f"Low balance: ₹{current_balance:,.0f} is below ₹50,000")

    if current_balance < 0:
        score += 25
        flags.append("Account is overdrawn")

    score = min(score, 100)

    # Alert level
    if score <= 30:
        alert_level = "low"
    elif score <= 60:
        alert_level = "medium"
    else:
        alert_level = "high"

    return {
        "account_id": account_id,
        "score": score,
        "alert_level": alert_level,
        "flags": flags,
    }
