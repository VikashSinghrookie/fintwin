import uuid
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, nullable=False)
    type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    to_account = Column(String, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
