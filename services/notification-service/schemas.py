from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    account_id: str
    title: str
    message: str
    type: str  # risk | alert | info


class NotificationOut(BaseModel):
    id: str
    account_id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCount(BaseModel):
    total: int
    unread: int
