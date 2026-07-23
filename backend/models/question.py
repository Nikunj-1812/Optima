from db.db_connection import run_query

class Question:
    @staticmethod
    def create(submission_id, question_text):
        return run_query(
            """INSERT INTO questions (submission_id, 
               VALUES (%s, %s) RETURNING *""",
            (submission_id, question_text),
            fetchone=True,
            commit=True,
        )

    @staticmethod
    def submit_answer(question_id, user_answer, ai_feedback):
        return run_query(
            """UPDATE questions SET user_answer = %s, ai_feedback = %s
               WHERE id = %s RETURNING *""",
            (user_answer, ai_feedback, question_id),
            fetchone=True,
            commit=True,
        )

    @staticmethod
    def for_submission(submission_id):
        return run_query(
            "SELECT * FROM questions WHERE submission_id = %s ORDER BY created_at",
            (submission_id,),
            fetch=True,
        )