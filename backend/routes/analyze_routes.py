from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from models.submission import Submission
from models.pattern import Pattern
from models.user import User
from routes.auth_routes import get_current_user
from services import claude_service
from db.db_connection import run_query

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


class ComplexityRequest(BaseModel):
    code: str
    language: str
    problem_title: Optional[str] = None


class OptimizeRequest(BaseModel):
    code: str
    language: str
    submission_id: Optional[int] = None


@router.post("/complexity", status_code=status.HTTP_201_CREATED)
def analyze_complexity(
    payload: ComplexityRequest,
    current_user: User = Depends(get_current_user),
):
    if not payload.code or not payload.language:
        raise HTTPException(status_code=400, detail="code and language are required")

    result = claude_service.analyze_complexity(payload.code, payload.language)
    patterns = claude_service.detect_patterns(payload.code, payload.language)

    time_comp = result.get("time_complexity") or result.get("time_comlexity", "")
    space_comp = result.get("space_complexity", "")

    sub = Submission.create(
        user_id=current_user.id,
        language=payload.language,
        code=payload.code,
        problem_title=payload.problem_title,
        time_complexity=time_comp,
        space_complexity=space_comp,
    )

    sub_id = sub["id"] if isinstance(sub, dict) and "id" in sub else getattr(sub, "id", None)

    for p in patterns:
        Pattern.create(sub_id, p["name"], p.get("confidence", 0.5))

    return {
        "submission": sub,
        "analysis": result,
        "patterns": patterns,
    }


@router.post("/optimize")
def optimize(
    payload: OptimizeRequest,
    current_user: User = Depends(get_current_user),
):
    if not payload.code or not payload.language:
        raise HTTPException(status_code=400, detail="code and language are required")

    result = claude_service.optimize_code(payload.code, payload.language)

    if payload.submission_id:
        run_query(
            "UPDATE submissions SET optimized_code = %s WHERE id = %s",
            (result.get("optimized_code", ""), payload.submission_id),
            commit=True,
        )

    return result