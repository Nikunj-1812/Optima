import json
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from db.db_connection import Base, db_session


class ABTest(Base):
    __tablename__ = "ab_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code_a = Column(Text, nullable=False)
    code_b = Column(Text, nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        parsed = {}
        try:
            parsed = json.loads(self.result_json) if isinstance(self.result_json, str) else self.result_json
        except Exception:
            parsed = {"raw": self.result_json}

        res = {
            "id": self.id,
            "user_id": self.user_id,
            "code_a": self.code_a,
            "code_b": self.code_b,
            "result_json": self.result_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if isinstance(parsed, dict):
            res.update(parsed)
            # Ensure winner is present
            if "winner" not in res and "winner" in parsed:
                res["winner"] = parsed["winner"]
        return res

    @staticmethod
    def create(user_id, code_a, code_b, result_json):
        with db_session() as session:
            raw_json = json.dumps(result_json) if not isinstance(result_json, str) else result_json
            test = ABTest(
                user_id=user_id,
                code_a=code_a,
                code_b=code_b,
                result_json=raw_json,
            )
            session.add(test)
            session.flush()
            session.refresh(test)
            return test.to_dict()

    @staticmethod
    def recent_for_user(user_id, limit=10):
        with db_session() as session:
            tests = (
                session.query(ABTest)
                .filter(ABTest.user_id == int(user_id))
                .order_by(ABTest.created_at.desc())
                .limit(limit)
                .all()
            )
            return [t.to_dict() for t in tests]