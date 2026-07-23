import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400)
    )  # 24 hours

    # PostgreSQL
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/optima"
    )

    # Claude
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

    # Code Execution
    EXECUTOR_PROVIDER = os.getenv("EXECUTOR_PROVIDER", "piston")
    PISTON_URL = os.getenv(
        "PISTON_URL",
        "https://emkc.org/api/v2/piston/execute"
    )
    JUDGE0_URL = os.getenv("JUDGE0_URL", "")
    JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")


# Global module-level aliases for JWT auth service
SECRET_KEY = Config.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = Config.JWT_ACCESS_TOKEN_EXPIRES // 60