from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from models.submission import Submission
from models.debug_session import DebugSession
from models.user import User
from routes.auth_routes import get_current_user
from services import claude_service

router = APIRouter(prefix="/api/debug", tags=["debug"])


class DebugRequest(BaseModel):
    submission_id: int
    error_message: str


@router.post("", status_code=status.HTTP_201_CREATED)
def debug_code(
    payload: DebugRequest,
    current_user: User = Depends(get_current_user),
):
    submission = Submission.find_by_id(payload.submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    code = submission.get("code") if isinstance(submission, dict) else getattr(submission, "code", "")
    lang = submission.get("language") if isinstance(submission, dict) else getattr(submission, "language", "")

    result = claude_service.debug_suggestion(code, lang, payload.error_message)
    session = DebugSession.create(
        payload.submission_id,
        result.get("error_type", "Unknown"),
        result.get("suggestion", ""),
    )

    return session


@router.get("/submission/{submission_id}")
def get_debug_sessions(
    submission_id: int,
    current_user: User = Depends(get_current_user),
):
    sessions = DebugSession.for_submission(submission_id)
    return {"debug_sessions": sessions}