from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import Config

DATABASE_URL = Config.DATABASE_URL
connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    with engine.connect() as conn:
        pass
    print(f"[DB] Connected to Database: {DATABASE_URL}")
except Exception as e:
    print(f"[DB Warning] Primary database ({DATABASE_URL}) unavailable. Falling back to SQLite: sqlite:///./optima.db")
    DATABASE_URL = "sqlite:///./optima.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI Dependency for route handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Context manager for model methods and standalone operations."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def run_query(query: str, params=None, fetch: bool = False, fetchone: bool = False, commit: bool = False):
    """
    Database-agnostic query executor using SQLAlchemy text constructs.
    Supports dictionary results and works across SQLite and PostgreSQL.
    """
    with db_session() as session:
        # Convert %s placeholders to :param format if raw postgres string passed
        clean_query = query
        param_dict = {}
        if params:
            if isinstance(params, (list, tuple)):
                # If positional, convert %s to named parameters :p0, :p1, ...
                parts = clean_query.split("%s")
                if len(parts) - 1 == len(params):
                    new_q = []
                    for idx, part in enumerate(parts[:-1]):
                        p_name = f"p{idx}"
                        param_dict[p_name] = params[idx]
                        new_q.append(f"{part}:{p_name}")
                    new_q.append(parts[-1])
                    clean_query = "".join(new_q)
                else:
                    clean_query = query
            elif isinstance(params, dict):
                param_dict = params

        stmt = text(clean_query)
        result = session.execute(stmt, param_dict)

        if fetchone:
            row = result.mappings().first()
            return dict(row) if row else None
        elif fetch:
            rows = result.mappings().all()
            return [dict(r) for r in rows]

        if commit:
            session.commit()
        return None
