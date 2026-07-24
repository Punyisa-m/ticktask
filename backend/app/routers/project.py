from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.security import get_current_user
from app import schemas
from app.models.project_member import ProjectMember
from pydantic import BaseModel

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

    # เพิ่มตัวเองเป็น member ของ project ที่สร้าง
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
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้ หรือคุณไม่ใช่เจ้าของ")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="user นี้เป็นสมาชิกอยู่แล้ว")

    new_member = ProjectMember(
        project_id=project_id,
        user_id=data.user_id,
        role=data.role,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return {"message": "เพิ่มสมาชิกสำเร็จ", "project_id": project_id, "user_id": data.user_id}

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