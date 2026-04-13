import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database import get_db
from models import Notification
from schemas import NotificationCreate, NotificationOut, NotificationCount

router = APIRouter(prefix="/notifications", tags=["notifications"])

JWT_SECRET = os.getenv("JWT_SECRET", "fintwin-super-secret-key-2024")
JWT_ALGORITHM = "HS256"
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
    return type("User", (), {"id": account_id})()


@router.get("/{account_id}", response_model=list[NotificationOut])
def get_notifications(
    account_id: str,
    type: Optional[str] = None,
    unread_only: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    query = db.query(Notification).filter(Notification.account_id == account_id)
    if type:
        query = query.filter(Notification.type == type)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).all()


@router.get("/count/{account_id}")
def get_notification_count(
    account_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    total = db.query(Notification).filter(Notification.account_id == account_id).count()
    unread = db.query(Notification).filter(
        Notification.account_id == account_id,
        Notification.is_read == False,
    ).count()
    return {"total": total, "unread": unread}


@router.post("/", response_model=NotificationOut)
def create_notification(
    req: NotificationCreate,
    db: Session = Depends(get_db),
    x_internal_key: Optional[str] = Header(None),
):
    # Internal API key auth — no JWT required
    if not x_internal_key or x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing internal key")
    notification = Notification(
        id=str(uuid.uuid4()),
        account_id=req.account_id,
        title=req.title,
        message=req.message,
        type=req.type,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/read/{notification_id}", response_model=NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/read-all/{account_id}")
def mark_all_read(
    account_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    count = db.query(Notification).filter(
        Notification.account_id == account_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read", "count": count}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted"}
