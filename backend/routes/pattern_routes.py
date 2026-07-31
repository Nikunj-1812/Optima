from fastapi import APIRouter, Depends

from models.pattern import Pattern
from models.submission import Submission
from models.user import User
from routes.auth_routes import get_current_user

router = APIRouter(prefix="/api/patterns", tags=["patterns"])


@router.get("/submission/{submission_id}")
def get_patterns(
    submission_id: int,
    current_user: User = Depends(get_current_user),
):
    patterns = Pattern.for_submission(submission_id)
    return {"patterns": patterns}


@router.get("/learned")
def get_learned_patterns(current_user: User = Depends(get_current_user)):
    patterns = Pattern.learned_by_user(current_user.id) or []
    learned = [p["pattern_name"] for p in patterns if isinstance(p, dict) and "pattern_name" in p]
    return {"patterns": learned}


@router.get("/weak-areas")
def get_weak_areas(current_user: User = Depends(get_current_user)):
    weak = Submission.weak_areas(current_user.id)
    return {"weak_areas": weak}