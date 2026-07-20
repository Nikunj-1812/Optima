from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

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