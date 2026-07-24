from flask import Blueprint, request,jsonify
from flask_jwt_extended import jwt_required
from services import executor_service

execute_bp = Blueprint("execute", __name__, url_prefix="/api/execute")

@execute_bp.post("")
@jwt_required()
def run_code():
    data = request.get_json(force=True)
    language = data.get("language")
    code = data.get("code")
    stdin = data.get("stdin", "")

    if not language or not code:
        return jsonify({"error": "language and code are required"}), 400 #bad request

    try:
        result = executor_service.run_code(language, code, stdin)
    except Exception as e:
        return jsonify({"error": f"Execution failed: {str(e)}"}), 502 #bad gateway

    return jsonify(result), 200 #ok
    