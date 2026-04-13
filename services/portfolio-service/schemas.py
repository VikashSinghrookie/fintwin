from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime


class HoldingCreate(BaseModel):
    ticker: str
    company_name: str
    quantity: float
    buy_price: float
    current_price: float

    @validator("quantity")
    def quantity_positive(cls, v):
        if v <= 0:
            raise ValueError("quantity must be greater than 0")
        return v

    @validator("buy_price")
    def buy_price_positive(cls, v):
        if v <= 0:
            raise ValueError("buy_price must be greater than 0")
        return v

    @validator("current_price")
    def current_price_positive(cls, v):
        if v <= 0:
            raise ValueError("current_price must be greater than 0")
        return v


class HoldingUpdate(BaseModel):
    current_price: float

    @validator("current_price")
    def current_price_positive(cls, v):
        if v <= 0:
            raise ValueError("current_price must be greater than 0")
        return v


class HoldingOut(BaseModel):
    id: str
    account_id: str
    ticker: str
    company_name: str
    quantity: float
    buy_price: float
    current_price: float
    current_value: float
    invested_value: float
    gain_loss: float
    gain_loss_pct: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortfolioSummary(BaseModel):
    total_portfolio_value: float
    total_invested: float
    total_gain_loss: float
    total_return_pct: float
    total_holdings: int
    best_performer: Optional[dict] = None
    worst_performer: Optional[dict] = None
