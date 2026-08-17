from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.security import get_current_user, require_department_head
from app import schemas
from app.models.project_member import ProjectMember
from pydantic import BaseModel
from app.models.task import Task
from app.models.requirement import Requirement
from app.models.chunk import RequirementChunk

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=schemas.ProjectResponse)
def create_project(
    project_data: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),
):
    new_project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Add yourself as a member of the project you created
    member = ProjectMember(
        project_id=new_project.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    db.commit()

    return new_project

class AddMemberRequest(BaseModel):
    user_id: int
    role: str = "member"

@router.post("/{project_id}/members")
def add_member(
    project_id: int,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),  
):
    project = db.query(Project).filter(Project.id == project_id).first() 
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This user is already a member.")

    new_member = ProjectMember(
        project_id=project_id,
        user_id=data.user_id,
        role=data.role,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return {"message": "Member added successfully.", "project_id": project_id, "user_id": data.user_id}

@router.get("/", response_model=list[schemas.ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )

@router.get("/{project_id}/members")
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    from app.models.user import User
    members = (
        db.query(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )
    return [{"id": m.id, "name": m.name, "email": m.email, "role": m.role} for m in members]


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    db.query(Task).filter(Task.project_id == project_id).delete()
    db.query(RequirementChunk).filter(RequirementChunk.project_id == project_id).delete()
    db.query(Requirement).filter(Requirement.project_id == project_id).delete()
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully."}
