from db.db_connection import run_query

class LearnProgress:
    @staticmethod
    def upsert(user_id, topic, status):
        return run_query(
            """INSERT INTO learn_progress (user_id, topic, status)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, topic)
                DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
                RETURNING *""",
            (user_id, topic, status),
            fetchone=True,
            commit=True,
        )

    @staticmethod
    def for_user(user_id):
        return run_query(
            "SELECT * FROM learn_progress WHERE user_id = %s ORDER BY topic",
            (user_id,),
            fetch=True,
        )