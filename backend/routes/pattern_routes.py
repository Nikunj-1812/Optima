from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.pattern import Pattern
from models.submission import Submission

pattern_bp = Blueprint("pattern", __name__, url_prefix="/api/pattrens")

@pattern_bp.get("/submission/<int:submission_id>")
@jwt_required()
def get_patterns(submission_id):
    patterns = Pattern.for_submission(submission_id)
    return jsonify({"patterns": patterns}), 200 #ok

@pattern_bp.get("/learned")
@jwt_required()
def get_learned_patterns():
    user_id = get_jwt_identity()
    patterns = Pattern.learned_by_user(user_id)
    return jsonify({"patterns": [p["pattern_name"] for p in patterns]}), 200 #ok

@pattern_bp.get("/weak-areas")
@jwt_required()
def get_weak_areas():
    user_id = get_jwt_identity()
    weak = Submission.weak_areas(user_id)
    return jsonify({"weak_areas": weak}), 200 #ok