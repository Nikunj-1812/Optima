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
    
    @staticmethod
    def find_by_id(submission_id):
        return run_query(
            "SELECT * FROM submissions WHERE id = %s", (submission_id,), fetchone=True
        )

    @staticmethod
    def weak_areas(user_id, limit=5):
        """Powers the 'Weak areas' tags — patterns most associated with
        submissions that were NOT optimal (e.g. O(n^2) or worse)."""
        return run_query(
            """SELECT p.pattern_name, COUNT(*) AS occurrences
               FROM patterns p
               JOIN submissions s ON s.id = p.submission_id
               WHERE s.user_id = %s
                 AND (s.time_complexity ILIKE %s OR s.time_complexity ILIKE %s)
               GROUP BY p.pattern_name
               ORDER BY occurrences DESC
               LIMIT %s""",
            (user_id, "%^2%", "%^3%", limit),
            fetch=True,
        )
