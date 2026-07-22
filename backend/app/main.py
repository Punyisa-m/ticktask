from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import engine, Base
from app.models import user, project, requirement, task
from app.routers import auth, project, requirement, task

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(project.router)
app.include_router(requirement.router)
app.include_router(task.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}