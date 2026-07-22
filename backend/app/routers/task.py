from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.security import get_current_user
from app import schemas
from app.services.ai_service import recommend_assignee
from app.models.user import User
from app.models.skill import UserSkill, Skill

router = APIRouter(prefix="/projects", tags=["tasks"])

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to: int | None = None
    status: str | None = None
    estimated_hours: float | None = None
    priority: str | None = None

@router.get("/{project_id}/tasks", response_model=list[schemas.TaskResponse])
def list_tasks(
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

    return db.query(Task).filter(Task.project_id == project_id).all()


@router.patch("/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.owner_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบ task นี้")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task

@router.post("/tasks/{task_id}/assign")
def assign_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    task = db.query(Task).join(Project).filter(
        Task.id == task_id,
        Project.owner_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบ task นี้")

    # ดึงสมาชิกทีมทั้งหมด (ยกเว้น manager เอง ถ้าอยากรวมด้วยก็เอาเงื่อนไขนี้ออกได้)
    members = db.query(User).filter(User.role == "member").all()

    candidates = []
    for member in members:
        user_skills = (
            db.query(Skill.name)
            .join(UserSkill, UserSkill.skill_id == Skill.id)
            .filter(UserSkill.user_id == member.id)
            .all()
        )
        skill_names = [s.name for s in user_skills]

        current_task_count = db.query(Task).filter(
            Task.assigned_to == member.id,
            Task.status != "done"
        ).count()

        candidates.append({
            "user_id": member.id,
            "name": member.name,
            "skills": skill_names,
            "current_task_count": current_task_count,
        })

    if not candidates:
        raise HTTPException(status_code=400, detail="ไม่มีสมาชิกทีมให้เลือก")

    result = recommend_assignee(task.title, task.description or "", candidates)
    return {"recommendation": result, "candidates_considered": candidates}