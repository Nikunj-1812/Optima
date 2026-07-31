from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.learn_progress import LearnProgress
from models.user import User
from routes.auth_routes import get_current_user

router = APIRouter(prefix="/api/learn", tags=["learn"])

TOPICS = [
    "Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack",
    "Binary Search", "Linked List", "Trees", "Tries", "Heap / Priority Queue",
    "Backtracking", "Graphs", "Dynamic Programming", "Greedy",
    "Intervals", "Math & Geometry", "Bit Manipulation",
]


class UpdateProgressRequest(BaseModel):
    topic: str
    status: str


@router.get("/topics")
def list_topics(current_user: User = Depends(get_current_user)):
    user_progress = LearnProgress.for_user(current_user.id) or []
    progress_map = {p["topic"]: p["status"] for p in user_progress if isinstance(p, dict) and "topic" in p}
    return {
        "topics": [
            {"topic": t, "status": progress_map.get(t, "not_started")} for t in TOPICS
        ]
    }


@router.post("/progress")
def update_progress(
    payload: UpdateProgressRequest,
    current_user: User = Depends(get_current_user),
):
    if payload.topic not in TOPICS:
        raise HTTPException(status_code=400, detail="Unknown topic")
    if payload.status not in ("not_started", "in_progress", "mastered"):
        raise HTTPException(status_code=400, detail="Invalid status")

    updated = LearnProgress.upsert(current_user.id, payload.topic, payload.status)
    return updated
