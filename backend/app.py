from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.db_connection import Base, engine
from routes import auth_routes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Code Complexity Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)


@app.get("/")
def root():
    return {"message": "API is running. Visit /docs for interactive API docs."}
