from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.security import get_current_user
from app import schemas

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=schemas.ProjectResponse)
def create_project(
    project_data: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    new_project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/", response_model=list[schemas.ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return db.query(Project).filter(Project.owner_id == current_user.id).all()