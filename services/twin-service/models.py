import uuid
from sqlalchemy import Column, String, Float, Integer, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, nullable=False)
    scenario = Column(String, nullable=False)  # withdrawal | deposit | rate_change
    amount = Column(Float, nullable=False)
    before_balance = Column(Float, nullable=False)
    after_balance = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False)
    alert_level = Column(String, nullable=False)  # low | medium | high
    recommendation = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
