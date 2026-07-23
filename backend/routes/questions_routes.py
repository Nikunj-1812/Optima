from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.submission import Submission
from models.question import Question
from services import claude_service

questions_bp = Blueprint("questions", __name__, url_prefix="/api/questions")

@questions_bp.post("/generate")
@jwt_required()
def generate_questions():
    data = request.get_json(force=True)
    submission_id = data.get("submission_id")

    submission = Submission.find_by_id(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404 #the server cannot locate the requested webpage

    questions_text = claude_service.generate_interview_questions(
        submission["code"], submission["language"]
    )

    created = [Question.create(submission_id, q) for q in questions_text]