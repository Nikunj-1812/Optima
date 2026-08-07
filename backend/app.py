from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.db_connection import Base, engine
import models  # Registers all 7 models before create_all
from routes import (
    auth_routes,
    analyze_routes,
    abtest_routes,
    debug_routes,
    execute_routes,
    learn_routes,
    pattern_routes,
    questions_routes,
)

# Automatically create all tables in SQLite / PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Optima Code Complexity & Learning Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(analyze_routes.router)
app.include_router(abtest_routes.router)
app.include_router(debug_routes.router)
app.include_router(execute_routes.router)
app.include_router(learn_routes.router)
app.include_router(pattern_routes.router)
app.include_router(questions_routes.router)


@app.get("/")
def root():
    return {"message": "Optima API is running. Visit /docs for interactive API docs."}
