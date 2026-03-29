import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database import get_db
from models import Account
from schemas import AccountCreate, AccountOut, BalanceUpdate
from routers.auth import generate_account_id, pwd_context

router = APIRouter(prefix="/accounts", tags=["accounts"])

JWT_SECRET = os.getenv("JWT_SECRET", "fintwin-super-secret-key-2024")
JWT_ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        account_id = payload.get("sub")
        if account_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    account = db.query(Account).filter(Account.id == account_id).first()
    if account is None:
        raise HTTPException(status_code=401, detail="User not found")
    return account


@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    return db.query(Account).filter(Account.id == current_user.id).all()


@router.post("/", response_model=AccountOut)
def create_account(req: AccountCreate, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    existing = db.query(Account).filter(Account.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    account_id = generate_account_id()
    hashed = pwd_context.hash(req.password)
    account = Account(
        id=account_id,
        name=req.name,
        email=req.email,
        password=hashed,
        type=req.type,
        balance=req.balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{account_id}/exists")
def check_account_exists(account_id: str, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"exists": True}



@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    if account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/{account_id}/balance")
def update_balance(account_id: str, req: BalanceUpdate, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.balance += req.delta
    db.commit()
    db.refresh(account)
    return {"id": account.id, "balance": account.balance}
