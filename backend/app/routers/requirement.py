from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.project import Project
from app.models.requirement import Requirement
from app.security import get_current_user
from app import schemas
from app.services.ai_service import analyze_requirement
from app.models.requirement import Requirement
from app.models.task import Task

router = APIRouter(prefix="/projects", tags=["requirements"])

class RequirementCreate(BaseModel):
    raw_text: str

@router.post("/{project_id}/requirements", response_model=schemas.RequirementResponse)
def create_requirement(
    project_id: int,
    data: RequirementCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    new_requirement = Requirement(
        project_id=project_id,
        raw_text=data.raw_text,
    )
    db.add(new_requirement)
    db.commit()
    db.refresh(new_requirement)
    return new_requirement

@router.get("/{project_id}/requirements", response_model=list[schemas.RequirementResponse])
def list_requirements(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    return db.query(Requirement).filter(Requirement.project_id == project_id).all()

@router.post("/{project_id}/requirements/{requirement_id}/analyze")
def analyze(
    project_id: int,
    requirement_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.project_id == project_id
    ).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="ไม่พบ requirement นี้")

    tasks = analyze_requirement(requirement.raw_text)
    return {"suggested_tasks": tasks}

@router.post("/{project_id}/requirements/{requirement_id}/tasks/confirm", response_model=list[schemas.TaskResponse])
def confirm_tasks(
    project_id: int,
    requirement_id: int,
    data: schemas.TaskConfirmRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.project_id == project_id
    ).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="ไม่พบ requirement นี้")

    created_tasks = []
    for task_item in data.tasks:
        new_task = Task(
            project_id=project_id,
            requirement_id=requirement_id,
            title=task_item.title,
            description=task_item.description,
            estimated_hours=task_item.estimated_hours,
            priority=task_item.priority,
            status="todo",
        )
        db.add(new_task)
        created_tasks.append(new_task)

    db.commit()
    for task in created_tasks:
        db.refresh(task)

    return created_tasks