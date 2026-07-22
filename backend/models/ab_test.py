import json 
from db.db_connection import run_query

class ABTest:
    @staticmethod
    def create(user_id, code_a, code_b, result_json):
        return run_query(
            """INSERT INTO ab_tests (user_id, code_a, code_b, result_json)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (user_id, code_a, code_b, json.dumps(result_json)),
            fetchone=True,
            commit=True,
        )

    @staticmethod
    def recent_for_user(user_id,limit=10):
        return run_query(
            """SELECT id, result_json, created_at FROM ab_tests
                WHERE user_id = %s ORDER BY created_at DESC LIMIT %s""",
            (user_id, limit),
            fetch=True,
        )