from db.db_connection import run_query


class Pattern:
    @staticmethod
    def create(submission_id, pattern_name, confidence):
        return run_query(
            """INSERT INTO patterns (submission_id, pattern_name, confidence)
               VALUES (%s, %s, %s) RETURNING *""",
            (submission_id, pattern_name, confidence),
            fetchone=True,
            commit=True,
        )

    @staticmethod
    def for_submission(submission_id):
        return run_query(
            "SELECT * FROM patterns WHERE submission_id = %s ORDER BY confidence DESC",
            (submission_id,),
            fetch=True,
        )

    @staticmethod
    def learned_by_user(user_id):
        """Distinct patterns a user has encountered — used for the
        'Patterns learned' dashboard stat."""
        return run_query(
            """SELECT DISTINCT p.pattern_name
               FROM patterns p
               JOIN submissions s ON s.id = p.submission_id
               WHERE s.user_id = %s""",
            (user_id,),
            fetch=True,
        )
