from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AccountCreate(BaseModel):
    name: str
    email: str
    password: str
    type: str = "savings"
    balance: float = 0.0


class AccountOut(BaseModel):
    id: str
    name: str
    email: str
    type: str
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    user: dict


class BalanceUpdate(BaseModel):
    delta: float
