import uuid
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, nullable=False)
    ticker = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
