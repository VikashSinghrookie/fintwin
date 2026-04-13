import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, SessionLocal
from models import Holding
from routers import portfolio

app = FastAPI(title="FinTwin Portfolio Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_data()


def seed_data():
    db = SessionLocal()
    try:
        existing = db.query(Holding).first()
        if existing:
            return

        demo_holdings = [
            Holding(
                id=str(uuid.uuid4()),
                account_id="ACC-003",
                ticker="RELIANCE",
                company_name="Reliance Industries",
                quantity=10,
                buy_price=6800.0,
                current_price=7200.0,
            ),
            Holding(
                id=str(uuid.uuid4()),
                account_id="ACC-003",
                ticker="TCS",
                company_name="Tata Consultancy",
                quantity=5,
                buy_price=3900.0,
                current_price=4384.0,
            ),
            Holding(
                id=str(uuid.uuid4()),
                account_id="ACC-003",
                ticker="HDFC",
                company_name="HDFC Bank",
                quantity=8,
                buy_price=1600.0,
                current_price=1566.0,
            ),
        ]
        db.add_all(demo_holdings)
        db.commit()
        print("✅ Seed data created: 3 demo holdings for ACC-003")
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "portfolio-service"}


@app.get("/")
def root():
    return {"service": "portfolio-service", "status": "running"}
