from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.security import get_current_user, require_department_head
from app import schemas

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
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(Task).filter(Task.project_id == project_id).all()


@router.patch("/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)
    is_head = current_user.role in ("department_head", "superadmin")

    if not is_head:
        if task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="You are not the owner of this task and cannot edit it.")
        not_allowed = set(update_data.keys()) - {"status"}
        if not_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"You can only edit the task status. You cannot edit {', '.join(not_allowed)}."
            )

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully."}