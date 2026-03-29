import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from schemas import SimulationRequest, SimulationResult
from engine import run_simulation

router = APIRouter(prefix="/simulate", tags=["simulate"])

JWT_SECRET = os.getenv("JWT_SECRET", "fintwin-super-secret-key-2024")
JWT_ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        account_id = payload.get("sub")
        if account_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return account_id


from fastapi import Request

@router.post("/", response_model=SimulationResult)
async def simulate(req: SimulationRequest, request: Request, current_user_id: str = Depends(get_current_user)):
    if req.account_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        auth_header = request.headers.get("Authorization")
        result = await run_simulation(req, auth_header)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
