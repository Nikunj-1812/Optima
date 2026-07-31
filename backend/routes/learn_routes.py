from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.learn_progress import LearnProgress

learn_bp = Blueprint("learn", __name__, url_prefix="/api/learn")

TOPICS = [
    "Arrays & Hashing", "Two Pointers", "Sliding Window", "Stack",
    "Binary Search", "Linked List", "Trees", "Tries", "Heap / Priority Queue",
    "Backtracking", "Graphs", "Dynamic Programming", "Greedy",
    "Intervals", "Math & Geometry", "Bit Manipulation",
]

@learn_bp.get("/topics")
@jwt_required()
def list_topics():
    user_id = get_jwt_identity()
    progress = {p["topic"]: p["status"] for p in LearnProgress.for_user(user_id)}
    return jsonify({
        "topics": [
            {"topic": t, "status": progress.get(t, "not_started")} for t in TOPICS
        ]
    }), 200 #

@learn_bp.post("/progress")
@jwt_required()
def update_progress():
    user_id = get_jwt_identity()
    data = request.get_json(force=True)
    topic = data.get("topic")
    status = data.get("status")

    if topic not in TOPICS:
        return jsonify({"error": "Unknown topic"}), 400 #bad request
    if status not in ("not_started", "in_progress", "mastered"):
        return jsonify({"error": "Invalid status"}), 400 #bad request

    updated = LearnProgress.upsert(user_id, topic, status)
    return jsonify(updated), 200 #ok
