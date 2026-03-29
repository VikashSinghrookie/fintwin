import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database import get_db
from models import Transaction
from schemas import TransactionCreate, TransactionOut

router = APIRouter(prefix="/transactions", tags=["transactions"])

ACCOUNT_SERVICE_URL = os.getenv("ACCOUNT_SERVICE_URL", "http://account-service:8001")

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


@router.post("/", response_model=TransactionOut)
async def create_transaction(req: TransactionCreate, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    # Force account_id to current user for deposit/withdrawal
    if req.type in ("deposit", "withdrawal"):
        account_id = current_user_id
    elif req.type == "transfer":
        account_id = current_user_id
        if not req.to_account:
            raise HTTPException(status_code=400, detail="to_account is required for transfers")
        # Validate destination account exists
        async with httpx.AsyncClient() as check_client:
            check_resp = await check_client.get(f"{ACCOUNT_SERVICE_URL}/accounts/{req.to_account}/exists")
            if check_resp.status_code != 200:
                raise HTTPException(status_code=404, detail="Destination account not found")
    else:
        account_id = current_user_id

    txn = Transaction(
        id=str(uuid.uuid4()),
        account_id=account_id,
        type=req.type,
        amount=req.amount,
        to_account=req.to_account,
        note=req.note,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    async with httpx.AsyncClient() as client:
        if req.type == "deposit":
            resp = await client.put(
                f"{ACCOUNT_SERVICE_URL}/accounts/{account_id}/balance",
                json={"delta": req.amount},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to update account balance")

        elif req.type == "withdrawal":
            resp = await client.put(
                f"{ACCOUNT_SERVICE_URL}/accounts/{account_id}/balance",
                json={"delta": -req.amount},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to update account balance")

        elif req.type == "transfer":
            resp1 = await client.put(
                f"{ACCOUNT_SERVICE_URL}/accounts/{account_id}/balance",
                json={"delta": -req.amount},
            )
            resp2 = await client.put(
                f"{ACCOUNT_SERVICE_URL}/accounts/{req.to_account}/balance",
                json={"delta": req.amount},
            )
            if resp1.status_code != 200 or resp2.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to update account balances")

    return txn


@router.get("/", response_model=list[TransactionOut])
def list_transactions(db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    from sqlalchemy import or_
    return db.query(Transaction).filter(
        or_(Transaction.account_id == current_user_id, Transaction.to_account == current_user_id)
    ).order_by(Transaction.created_at.desc()).all()


@router.get("/account/{account_id}", response_model=list[TransactionOut])
def get_account_transactions(account_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user)):
    if account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    from sqlalchemy import or_
    return (
        db.query(Transaction)
        .filter(or_(Transaction.account_id == account_id, Transaction.to_account == account_id))
        .order_by(Transaction.created_at.desc())
        .all()
    )
