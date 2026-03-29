from pydantic import BaseModel
from typing import Optional, List


class SimulationRequest(BaseModel):
    account_id: str
    scenario: str  # withdrawal, deposit, rate_change
    amount: float


class SimulationResult(BaseModel):
    account_id: str
    scenario: str
    amount: float
    current_balance: float
    virtual_balance: float
    risk_score: int
    alert_level: str
    flags: List[str]
    recommendation: str
