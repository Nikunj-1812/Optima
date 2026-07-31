from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from models.user import User
from routes.auth_routes import get_current_user
from services import executor_service

router = APIRouter(prefix="/api/execute", tags=["execute"])


class ExecuteRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = ""


@router.post("")
def run_code(
    payload: ExecuteRequest,
    current_user: User = Depends(get_current_user),
):
    if not payload.language or not payload.code:
        raise HTTPException(status_code=400, detail="language and code are required")

    try:
        result = executor_service.run_code(payload.language, payload.code, payload.stdin or "")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Execution failed: {str(e)}")

    return result