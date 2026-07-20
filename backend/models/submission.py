from db.db_connection import run_query

class Submission:
    @staticmethod
    def create(user_id, language, code, problem_title=None,
               time_complexity=None, space_complexity=None, optimized_code=None):
        return run_query(
            """INSERT INTO submissions
               (user_id, problem_title, language, code, time_complexity, space_complexity, optimized_code)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING *""",
            (user_id, problem_title, language, code, time_complexity, space_complexity, optimized_code),
            fetchone=True,
            commit=True,
        )
    
    @staticmethod
    def recent_for_user(user_id, limit=10):
        """Powers the 'Recent submissions' table on the dashboard."""
        return run_query(
            """SELECT id, problem_title, language, time_complexity, space_complexity, created_at
               FROM submissions
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT %s""",
            (user_id, limit),
            fetch=True,
        )
    
    