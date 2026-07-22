from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.ab_test import ABTest
from services import claude_service

abtest_bp = Blueprint("abtest",__name__, url_prefix="/api/abte")

@abtest_bp.post("")
@jwt_required()
def create_ab_test():
    user_id = get_jwt_identity()
    data = request.get_json(force=True)
    code_a = data.get("code_a")
    code_b = data.get("code_b")
    language = data.get("language")

    if not code_a or not code_b or not language:
        return jsonify({"error": "code_a, code_b and language are required"}), 400 #bad request

    result = claude_service.compare_ab(code_a, code_b, language)
    ab_test = ABTest.create(user_id, code_a, code_b, result)

    return jsonify(ab_test), 201 #created

@abtest_bp.get("")
@jwt_required()
def list_ab_tests():
    user_id = get_jwt_identity()
    tests = ABTest.recent_for_user(user_id)
    return jsonify({"ab_tests": tests}), 200 #ok