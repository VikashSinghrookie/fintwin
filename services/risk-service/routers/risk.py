import os
import json
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database import get_db
from models import RiskScore
from schemas import RiskAnalyzeRequest, RiskScoreOut
from scoring import compute_risk_score

router = APIRouter(prefix="/risk", tags=["risk"])

ACCOUNT_SERVICE_URL = os.getenv("ACCOUNT_SERVICE_URL", "http://account-service:8001")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8006")
INTERNAL_KEY = os.getenv("INTERNAL_KEY", "fintwin-internal-2024")

JWT_SECRET = os.getenv("JWT_SECRET", "fintwin-super-secret-key-2024")
JWT_ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        account_id = payload.get("sub")
        if account_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return account_id


async def send_risk_notification(account_id: str, score: int, flags: list):
    """Send notification if risk score is above threshold."""
    try:
        if score > 40:
            notif_type = "risk" if score > 60 else "alert"
            flag_text = flags[0] if flags else ""
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{NOTIFICATION_SERVICE_URL}/notifications/",
                    json={
                        "account_id": account_id,
                        "title": "Risk alert on your account",
                        "message": f"Risk score updated to {score}/100. {flag_text}",
                        "type": notif_type,
                    },
                    headers={"X-Internal-Key": INTERNAL_KEY},
                    timeout=5.0,
                )
    except Exception:
        pass  # Risk analysis completes regardless of notification failure


@router.post("/analyze", response_model=RiskScoreOut)
async def analyze_risk(req: RiskAnalyzeRequest, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    # Force analysis on the current user's account only
    req.account_id = current_user_id

    result = compute_risk_score(req.account_id, req.current_balance, req.recent_transactions)

    existing = db.query(RiskScore).filter(RiskScore.account_id == req.account_id).first()
    if existing:
        existing.score = result["score"]
        existing.flags = json.dumps(result["flags"])
        db.commit()
        db.refresh(existing)
        response = RiskScoreOut(
            id=existing.id,
            account_id=existing.account_id,
            score=existing.score,
            alert_level=result["alert_level"],
            flags=result["flags"],
            updated_at=existing.updated_at,
        )
    else:
        risk_record = RiskScore(
            id=str(uuid.uuid4()),
            account_id=req.account_id,
            score=result["score"],
            flags=json.dumps(result["flags"]),
        )
        db.add(risk_record)
        db.commit()
        db.refresh(risk_record)
        response = RiskScoreOut(
            id=risk_record.id,
            account_id=risk_record.account_id,
            score=risk_record.score,
            alert_level=result["alert_level"],
            flags=result["flags"],
            updated_at=risk_record.updated_at,
        )

    # Send risk notification if score > 40
    await send_risk_notification(req.account_id, result["score"], result["flags"])

    return response


@router.get("/score/{account_id}", response_model=RiskScoreOut)
def get_risk_score(account_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    if account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    record = db.query(RiskScore).filter(RiskScore.account_id == account_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No risk score found for this account")

    flags = []
    if record.flags:
        try:
            flags = json.loads(record.flags)
        except json.JSONDecodeError:
            flags = []

    score = record.score
    if score <= 30:
        alert_level = "low"
    elif score <= 60:
        alert_level = "medium"
    else:
        alert_level = "high"

    return RiskScoreOut(
        id=record.id,
        account_id=record.account_id,
        score=score,
        alert_level=alert_level,
        flags=flags,
        updated_at=record.updated_at,
    )


@router.get("/flags/{account_id}")
def get_risk_flags(account_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    if account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    record = db.query(RiskScore).filter(RiskScore.account_id == account_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No risk data found for this account")

    flags = []
    if record.flags:
        try:
            flags = json.loads(record.flags)
        except json.JSONDecodeError:
            flags = []

    return {"account_id": account_id, "flags": flags}


from fastapi import Request
from datetime import datetime

@router.get("/notifications/{account_id}")
async def get_notifications(
    account_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    if account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    notifications = []
    
    # 1. Check risk score
    record = db.query(RiskScore).filter(RiskScore.account_id == account_id).first()
    if record:
        if record.score > 60:
            notifications.append({"message": "High risk activity detected on your account", "type": "Risk"})
        elif record.score > 30 and record.score <= 60:
            notifications.append({"message": "Moderate risk detected — review your recent transactions", "type": "Risk"})

    # 2. Check transactions and balance
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}
    
    TRANSACTION_SERVICE_URL = os.getenv("TRANSACTION_SERVICE_URL", "http://transaction-service:8002")
    
    async with httpx.AsyncClient() as client:
        balance = 0
        acc_resp = await client.get(f"{ACCOUNT_SERVICE_URL}/accounts/{account_id}", headers=headers)
        if acc_resp.status_code == 200:
            balance = acc_resp.json().get("balance", 0)

        txn_resp = await client.get(f"{TRANSACTION_SERVICE_URL}/transactions/account/{account_id}", headers=headers)
        if txn_resp.status_code == 200:
            transactions = txn_resp.json()
            
            # Check for large transactions (> 50% of balance)
            if balance > 0:
                has_large_txn = any(abs(t.get("amount", 0)) > balance * 0.5 for t in transactions)
                if has_large_txn:
                    notifications.append({"message": "Large transaction detected on your account", "type": "Alert"})
            
            # Check for 3+ transactions today
            today_str = datetime.utcnow().date().isoformat()
            txns_today = [
                t for t in transactions
                if t.get("created_at", "").startswith(today_str)
            ]
            if len(txns_today) >= 3:
                notifications.append({"message": "High transaction frequency today", "type": "Alert"})

    # 3. Fallback message if no risk issues or alerts
    if len(notifications) == 0:
        notifications.append({"message": "All activity looks normal", "type": "Info"})

    # 4. Always add the twin sync complete message
    notifications.append({"message": "Digital Twin sync complete — your data is up to date", "type": "Info"})

    return notifications
