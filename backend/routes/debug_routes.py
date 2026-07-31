from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.submission import Submission
from models.degug_session import DebugSession
from services import claude_service

debug_bp = Blueprint("debug", __name__, url_prefix="/api/debug")

@debug_bp.post("")
@jwt_required()
def debug_code():
    data = request.get_json(force=True)
    submission_id = data.get("submission_id")
    error_message = data.get("error_message")

    submission = Submission.find_by_id(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404 #not found

    result = claude_service.debug_suggestion(
        submission["code"], submission["language"], error_message
    )
    session = DebugSession.create(submission_id, result["error_type"], result["suggestion"])

    return jsonify(session), 201 #created

@debug_bp.get("/submission/<int:submission_id>")
@jwt_required()
def get_debug_sessions(submission_id):
    sessions = DebugSession.for_sunmission(submission_id)
    return jsonify({"debug_sessions": sessions}), 200 #ok 