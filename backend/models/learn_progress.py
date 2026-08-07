from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, func
from db.db_connection import Base, db_session


class LearnProgress(Base):
    __tablename__ = "learn_progress"
    __table_args__ = (UniqueConstraint("user_id", "topic", name="uq_user_topic"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="not_started")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "topic": self.topic,
            "status": self.status,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def upsert(user_id, topic, status):
        with db_session() as session:
            record = (
                session.query(LearnProgress)
                .filter(LearnProgress.user_id == int(user_id), LearnProgress.topic == topic)
                .first()
            )
            if record:
                record.status = status
                record.updated_at = func.now()
            else:
                record = LearnProgress(user_id=user_id, topic=topic, status=status)
                session.add(record)

            session.flush()
            session.refresh(record)
            return record.to_dict()

    @staticmethod
    def for_user(user_id):
        with db_session() as session:
            records = (
                session.query(LearnProgress)
                .filter(LearnProgress.user_id == int(user_id))
                .order_by(LearnProgress.topic.asc())
                .all()
            )
            return [r.to_dict() for r in records]