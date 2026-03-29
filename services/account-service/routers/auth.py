import os
import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt

from database import get_db
from models import Account
from schemas import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "fintwin-super")
JWT_ALGORITHM = "HS256"


def generate_account_id():
    chars = string.ascii_uppercase + string.digits
    return "ACC-" + "".join(random.choices(chars, k=6))


def create_token(account_id: str, name: str):
    payload = {
        "sub": account_id,
        "name": name,
        "exp": datetime.utcnow() + timedelta(minutes=60),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Account).filter(Account.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    account_id = generate_account_id()
    hashed = pwd_context.hash(req.password)
    account = Account(
        id=account_id,
        name=req.name,
        email=req.email,
        password=hashed,
        type="savings",
        balance=0.0,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    token = create_token(account.id, account.name)
    return TokenResponse(
        token=token,
        user={"id": account.id, "name": account.name, "email": account.email},
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == req.email).first()
    if not account or not pwd_context.verify(req.password, account.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(account.id, account.name)
    return TokenResponse(
        token=token,
        user={"id": account.id, "name": account.name, "email": account.email},
    )
