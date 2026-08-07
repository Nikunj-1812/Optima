from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from db.db_connection import Base, db_session
from models.submission import Submission


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    pattern_name = Column(String(255), nullable=False, index=True)
    confidence = Column(Float, default=0.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "pattern_name": self.pattern_name,
            "name": self.pattern_name,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def create(submission_id, pattern_name, confidence=0.5):
        with db_session() as session:
            pat = Pattern(
                submission_id=submission_id,
                pattern_name=pattern_name,
                confidence=confidence,
            )
            session.add(pat)
            session.flush()
            session.refresh(pat)
            return pat.to_dict()

    @staticmethod
    def for_submission(submission_id):
        with db_session() as session:
            pats = (
                session.query(Pattern)
                .filter(Pattern.submission_id == int(submission_id))
                .order_by(Pattern.confidence.desc())
                .all()
            )
            return [p.to_dict() for p in pats]

    @staticmethod
    def learned_by_user(user_id):
        with db_session() as session:
            results = (
                session.query(Pattern.pattern_name)
                .join(Submission, Submission.id == Pattern.submission_id)
                .filter(Submission.user_id == int(user_id))
                .distinct()
                .all()
            )
            return [{"pattern_name": r[0], "name": r[0]} for r in results]