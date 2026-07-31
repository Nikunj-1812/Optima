from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from models.submission import Submission
from models.question import Question
from models.user import User
from routes.auth_routes import get_current_user
from services import claude_service

router = APIRouter(prefix="/api/questions", tags=["questions"])


class GenerateQuestionsRequest(BaseModel):
    submission_id: int


class SubmitAnswerRequest(BaseModel):
    question_id: int
    user_answer: str


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_questions(
    payload: GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user),
):
    submission = Submission.find_by_id(payload.submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    code = submission.get("code") if isinstance(submission, dict) else getattr(submission, "code", "")
    lang = submission.get("language") if isinstance(submission, dict) else getattr(submission, "language", "")

    questions_text = claude_service.generate_interview_questions(code, lang)
    created = [Question.create(payload.submission_id, q) for q in questions_text]

    return {"questions": created}


@router.get("/submission/{submission_id}")
def get_questions_for_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
):
    questions = Question.for_submission(submission_id)
    return {"questions": questions}


@router.post("/answer")
def submit_answer(
    payload: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
):
    grading = claude_service.grade_answer(
        question_text="", user_answer=payload.user_answer
    )
    feedback = grading.get("feedback", "")
    updated = Question.submit_answer(payload.question_id, payload.user_answer, feedback)
    return {"question": updated, "grading": grading}