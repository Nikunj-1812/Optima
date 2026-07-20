from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.submission import Submission
from models.pattern import Pattern
from services import claude_service

analyze_bp = Blueprint("analyze", __name__, url_prefix="/api/analyze")

@analyze_bp.post("/complexity")
@jwt_required()
def analyze_complexity():
    user_id= get_jwt_identity()
    data = request.get_json(force=True)
    code = data.get("code")
    language = data.get("language")
    problem_title = data.get("problem_title")

    if not code or not language:
        return jsonify({"error": "code and language are required"}), 400  #bad request
    
    result = claude_service.analyze_complexity(code, language)
    patterns = claude_service.detect_patterns(code, language)
    
    submission = Submission.create(
        user_id=user_id,
        language=language,
        code=code,
        problem_title=problem_title,
        time_complexity=result["time_complexity"],
        space_complexity=result["space_complexity"],
    )

    for p in patterns:
        Pattern.create(submission["id"], p["name"], p.get("confidence", 0.5))

    return jsonify({
        "submission":submission,
        "analysis": result,
        "patterns": patterns,
    }), 201 #create


@analyze_bp.post("/optimize")
@jwt_required()
def optimize():
    data = request.get_json(force=True)
    code = data.get("code")
    language = data.get("language")
    submission_id = data.get("submission_id")

    if not code or not language:
        return jsonify({"error": "code and language are required"}), 400  #bad request
    
    result = claude_service.optimize_code(code, language)

    if submission_id:
        from db.db_connection import run_query
        run_query(
            """UPDATE submissions SET optimized_code = %s WHERE id = %s""",
            (result["optimized_code"], submission_id),
            commit=True,
        )

    return jsonify(result), 200 #create
