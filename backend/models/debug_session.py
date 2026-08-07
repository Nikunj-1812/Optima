from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from db.db_connection import Base, db_session


class DebugSession(Base):
    __tablename__ = "debug_sessions"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    error_type = Column(String(255), nullable=True)
    suggestion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "error_type": self.error_type,
            "suggestion": self.suggestion,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def create(submission_id, error_type, suggestion):
        with db_session() as session:
            debug_sess = DebugSession(
                submission_id=submission_id,
                error_type=error_type,
                suggestion=suggestion,
            )
            session.add(debug_sess)
            session.flush()
            session.refresh(debug_sess)
            return debug_sess.to_dict()

    @staticmethod
    def for_submission(submission_id):
        with db_session() as session:
            sessions = (
                session.query(DebugSession)
                .filter(DebugSession.submission_id == int(submission_id))
                .order_by(DebugSession.created_at.desc())
                .all()
            )
            return [s.to_dict() for s in sessions]