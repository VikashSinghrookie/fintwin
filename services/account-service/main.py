from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from database import Base, engine, SessionLocal
from models import Account
from routers import auth, accounts

app = FastAPI(title="FinTwin Account Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_data()


def seed_data():
    db = SessionLocal()
    try:
        existing = db.query(Account).first()
        if existing:
            return

        demo_accounts = [
            Account(
                id="ACC-ADMIN1",
                name="Admin User",
                email="admin@fintwin.com",
                password=pwd_context.hash("fintwin123"),
                type="savings",
                balance=0.0,
            ),
            Account(
                id="ACC-001",
                name="Shiva Dixit",
                email="shiva@fintwin.com",
                password=pwd_context.hash("password123"),
                type="savings",
                balance=210000.0,
            ),
            Account(
                id="ACC-002",
                name="Vikash Singh",
                email="vikash@fintwin.com",
                password=pwd_context.hash("password123"),
                type="current",
                balance=97500.0,
            ),
            Account(
                id="ACC-003",
                name="Utkarsh Verma",
                email="utkarsh@fintwin.com",
                password=pwd_context.hash("password123"),
                type="portfolio",
                balance=175000.0,
            ),
        ]
        db.add_all(demo_accounts)
        db.commit()
        print("✅ Seed data created: 4 accounts (admin + 3 demo)")
    finally:
        db.close()


@app.get("/")
def root():
    return {"service": "account-service", "status": "running"}
