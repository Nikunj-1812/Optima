from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from models.ab_test import ABTest
from models.user import User
from routes.auth_routes import get_current_user
from services import claude_service

router = APIRouter(prefix="/api/abtest", tags=["abtest"])


class ABTestRequest(BaseModel):
    code_a: str
    code_b: str
    language: str


@router.post("", status_code=status.HTTP_201_CREATED)
def create_ab_test(
    payload: ABTestRequest,
    current_user: User = Depends(get_current_user),
):
    if not payload.code_a or not payload.code_b or not payload.language:
        raise HTTPException(
            status_code=400,
            detail="code_a, code_b and language are required",
        )

    result = claude_service.compare_ab(payload.code_a, payload.code_b, payload.language)
    ab_test = ABTest.create(current_user.id, payload.code_a, payload.code_b, result)
    return ab_test


@router.get("")
def list_ab_tests(current_user: User = Depends(get_current_user)):
    tests = ABTest.recent_for_user(current_user.id)
    return {"ab_tests": tests}