from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import twin

app = FastAPI(title="FinTwin Twin Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(twin.router)


@app.get("/")
def root():
    return {"service": "twin-service", "status": "running"}
