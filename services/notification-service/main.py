import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, SessionLocal
from models import Notification
from routers import notifications

app = FastAPI(title="FinTwin Notification Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notifications.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_data()


def seed_data():
    db = SessionLocal()
    try:
        existing = db.query(Notification).first()
        if existing:
            return

        demo_notifications = [
            Notification(
                id=str(uuid.uuid4()),
                account_id="ACC-ADMIN1",
                title="Large withdrawal detected",
                message="A withdrawal of ₹8,000 was flagged",
                type="risk",
            ),
            Notification(
                id=str(uuid.uuid4()),
                account_id="ACC-ADMIN1",
                title="Balance below threshold",
                message="Account balance dropped below ₹50,000",
                type="alert",
            ),
            Notification(
                id=str(uuid.uuid4()),
                account_id="ACC-ADMIN1",
                title="Welcome to FinTwin",
                message="Your account is set up and ready",
                type="info",
                is_read=True,
            ),
        ]
        db.add_all(demo_notifications)
        db.commit()
        print("✅ Seed data created: 3 demo notifications for ACC-ADMIN1")
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "notification-service"}


@app.get("/")
def root():
    return {"service": "notification-service", "status": "running"}
