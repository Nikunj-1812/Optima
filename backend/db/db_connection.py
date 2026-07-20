from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL, Config
import psycopg2
import psycopg2.extras
from psycopg2 import pool

_pool = None

connect_arg = {}
if DATABASE_URL.startswith("sqlite"):
    connect_arg = {"check_same_thread": False} 

engine = create_engine(DATABASE_URL , connect_args=connect_arg)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_pool(minconn=1, maxconn=10):
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn,
            maxconn,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            dbname=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
        )
    return _pool

def get_connection():
    if _pool is None:
        init_pool()
    return _pool.getconn()


def put_connection(conn):
    if _pool is not None:
        _pool.putconn(conn)

def run_query(query, params=None, fetch=False, fetchone=False, commit=False):
    """Small helper: run a query and optionally fetch/commit results."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params or ())
            result = None
            if fetchone:
                result = cur.fetchone()
            elif fetch:
                result = cur.fetchall()
            if commit:
                conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        put_connection(conn)
