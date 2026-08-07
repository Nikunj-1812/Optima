from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from db.db_connection import Base, db_session


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_title = Column(String(255), nullable=True)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    time_complexity = Column(String(100), nullable=True)
    space_complexity = Column(String(100), nullable=True)
    optimized_code = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "problem_title": self.problem_title,
            "language": self.language,
            "code": self.code,
            "time_complexity": self.time_complexity,
            "space_complexity": self.space_complexity,
            "optimized_code": self.optimized_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def create(user_id, language, code, problem_title=None,
               time_complexity=None, space_complexity=None, optimized_code=None):
        with db_session() as session:
            sub = Submission(
                user_id=user_id,
                language=language,
                code=code,
                problem_title=problem_title,
                time_complexity=time_complexity,
                space_complexity=space_complexity,
                optimized_code=optimized_code,
            )
            session.add(sub)
            session.flush()
            session.refresh(sub)
            return sub.to_dict()

    @staticmethod
    def find_by_id(submission_id):
        with db_session() as session:
            sub = session.query(Submission).filter(Submission.id == int(submission_id)).first()
            return sub.to_dict() if sub else None

    @staticmethod
    def recent_for_user(user_id, limit=10):
        with db_session() as session:
            subs = (
                session.query(Submission)
                .filter(Submission.user_id == int(user_id))
                .order_by(Submission.created_at.desc())
                .limit(limit)
                .all()
            )
            return [s.to_dict() for s in subs]

    @staticmethod
    def weak_areas(user_id):
        with db_session() as session:
            results = (
                session.query(Submission.time_complexity, func.count(Submission.id).label("count"))
                .filter(Submission.user_id == int(user_id), Submission.time_complexity.isnot(None))
                .group_by(Submission.time_complexity)
                .all()
            )
            return [{"time_complexity": r[0], "count": r[1]} for r in results]