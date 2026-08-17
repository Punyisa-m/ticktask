from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.department import Department
from app.security import get_current_user, hash_password
from app import schemas

router = APIRouter(prefix="/admin", tags=["admin"])


def require_superadmin(current_user = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only the Super Admin can perform this action.")
    return current_user


class DepartmentCreate(BaseModel):
    name: str

class DepartmentHeadCreate(BaseModel):
    name: str
    email: str
    password: str
    department_id: int


@router.post("/departments")
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    _admin = Depends(require_superadmin),
):
    new_dept = Department(name=data.name)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_dept


@router.get("/departments")
def list_departments(
    db: Session = Depends(get_db),
    _admin = Depends(require_superadmin),
):
    return db.query(Department).all()


@router.post("/department-heads", response_model=schemas.UserResponse)
def create_department_head(
    data: DepartmentHeadCreate,
    db: Session = Depends(get_db),
    _admin = Depends(require_superadmin),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email is already in use.")

    department = db.query(Department).filter(Department.id == data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found.")

    new_head = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="department_head",
        department_id=data.department_id,
    )
    db.add(new_head)
    db.commit()
    db.refresh(new_head)
    return new_head