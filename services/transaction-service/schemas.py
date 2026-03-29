from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TransactionCreate(BaseModel):
    account_id: str
    type: str
    amount: float
    to_account: Optional[str] = None
    note: Optional[str] = None


class TransactionOut(BaseModel):
    id: str
    account_id: str
    type: str
    amount: float
    to_account: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
