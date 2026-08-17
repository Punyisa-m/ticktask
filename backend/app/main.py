from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from app.database import engine, Base
from app.models import user, project, requirement, task, skill, chunk, project_member, department
from app.routers import auth, project, requirement, task, skill, admin, member_management
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(project.router)
app.include_router(requirement.router)
app.include_router(task.router)
app.include_router(skill.router)
app.include_router(admin.router)
app.include_router(member_management.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}