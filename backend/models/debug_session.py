from db.db_connection import run_query

class DebugSession:
    @staticmethod
    def create(submission_id, error_type, suggestion):
        return run_query(
            """INSERT INTO debug_sessions (submission_id, error_type, suggestion)
                VALUES (%s, %s, %s) RETURNING *""",
            (submission_id, error_type, suggestion),
            fetchone=True,
            commit=True,
        )

    @staticmethod
    def for_submission(submission_id):
        return run_query(
            "SELECT * FROM debug_sessions WHERE submission_id = %s ORDER BY created_at DESC",
            (submission_id,),
            fetch=True,
        )