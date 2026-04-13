import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from schemas import SimulationRequest, SimulationResult
from engine import run_simulation
from database import get_db
from models import Simulation

router = APIRouter(prefix="/simulate", tags=["simulate"])

JWT_SECRET = os.getenv("JWT_SECRET", "fintwin-super-secret-key-2024")
JWT_ALGORITHM = "HS256"
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8006")
INTERNAL_KEY = os.getenv("INTERNAL_KEY", "fintwin-internal-2024")

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


@router.post("/", response_model=SimulationResult)
async def simulate(req: SimulationRequest, request: Request, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    if req.account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        auth_header = request.headers.get("Authorization")
        result = await run_simulation(req, auth_header)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save simulation to history
    sim = Simulation(
        id=str(uuid.uuid4()),
        account_id=current_user_id,
        scenario=req.scenario,
        amount=req.amount,
        before_balance=result.current_balance,
        after_balance=result.virtual_balance,
        risk_score=result.risk_score,
        alert_level=result.alert_level,
        recommendation=result.recommendation,
    )
    db.add(sim)
    db.commit()

    # Send notification if risk is medium or high
    try:
        if result.alert_level in ("medium", "high"):
            notif_type = "risk" if result.alert_level == "high" else "alert"
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{NOTIFICATION_SERVICE_URL}/notifications/",
                    json={
                        "account_id": current_user_id,
                        "title": "Simulation completed",
                        "message": f"Your {req.scenario} simulation returned risk score {result.risk_score}",
                        "type": notif_type,
                    },
                    headers={"X-Internal-Key": INTERNAL_KEY},
                    timeout=5.0,
                )
    except Exception:
        pass  # Don't fail simulation if notification service is down

    return result


@router.get("/history/{account_id}")
def get_simulation_history(account_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    if account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    simulations = (
        db.query(Simulation)
        .filter(Simulation.account_id == account_id)
        .order_by(Simulation.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": s.id,
            "account_id": s.account_id,
            "scenario": s.scenario,
            "amount": s.amount,
            "before_balance": s.before_balance,
            "after_balance": s.after_balance,
            "risk_score": s.risk_score,
            "alert_level": s.alert_level,
            "recommendation": s.recommendation,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in simulations
    ]


@router.get("/history/detail/{simulation_id}")
def get_simulation_detail(simulation_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "id": sim.id,
        "account_id": sim.account_id,
        "scenario": sim.scenario,
        "amount": sim.amount,
        "before_balance": sim.before_balance,
        "after_balance": sim.after_balance,
        "risk_score": sim.risk_score,
        "alert_level": sim.alert_level,
        "recommendation": sim.recommendation,
        "created_at": sim.created_at.isoformat() if sim.created_at else None,
    }

@router.delete("/history/{account_id}")
def clear_simulation_history(account_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    if account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    deleted_count = db.query(Simulation).filter(Simulation.account_id == account_id).delete()
    db.commit()
    return {"message": "Simulation history cleared", "deleted_count": deleted_count}

@router.delete("/history/detail/{simulation_id}")
def delete_single_simulation(simulation_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(sim)
    db.commit()
    return {"message": "Simulation deleted"}
