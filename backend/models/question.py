from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from db.db_connection import Base, db_session


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    user_answer = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "question_text": self.question_text,
            "text": self.question_text,
            "question": self.question_text,
            "user_answer": self.user_answer,
            "ai_feedback": self.ai_feedback,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def create(submission_id, question_text):
        with db_session() as session:
            q = Question(
                submission_id=submission_id,
                question_text=question_text,
            )
            session.add(q)
            session.flush()
            session.refresh(q)
            return q.to_dict()

    @staticmethod
    def submit_answer(question_id, user_answer, ai_feedback):
        with db_session() as session:
            q = session.query(Question).filter(Question.id == int(question_id)).first()
            if q:
                q.user_answer = user_answer
                q.ai_feedback = ai_feedback
                session.flush()
                session.refresh(q)
                return q.to_dict()
            return None

    @staticmethod
    def for_submission(submission_id):
        with db_session() as session:
            qs = (
                session.query(Question)
                .filter(Question.submission_id == int(submission_id))
                .order_by(Question.created_at.asc())
                .all()
            )
            return [q.to_dict() for q in qs]