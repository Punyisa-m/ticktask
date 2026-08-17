from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.security import get_current_user, hash_password
from app import schemas
from pydantic import BaseModel

class MemberUpdate(BaseModel):
    name: str
    email: str
    password: str | None = None
    
    
router = APIRouter(prefix="/department", tags=["department"])


def require_department_head(current_user = Depends(get_current_user)):
    if current_user.role != "department_head":
        raise HTTPException(status_code=403, detail="Only the Department Head can perform this action.")
    return current_user


class MemberCreate(BaseModel):
    name: str
    email: str
    password: str


@router.post("/members", response_model=schemas.UserResponse)
def create_member(
    data: MemberCreate,
    db: Session = Depends(get_db),
    head = Depends(require_department_head),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email is already in use.")

    new_member = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="member",
        department_id=head.department_id,  # Assign to the same department as the creating Department Head.
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


@router.get("/members", response_model=list[schemas.UserResponse])
def list_department_members(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # Both the Head and members of the same department can view.
    if current_user.role not in ["department_head", "member"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    return db.query(User).filter(User.department_id == current_user.department_id).all()


@router.put("/members/{user_id}", response_model=schemas.UserResponse)
def update_member(
    user_id: int,
    data: MemberUpdate,  
    db: Session = Depends(get_db),
    head = Depends(require_department_head),
):
    member = db.query(User).filter(
        User.id == user_id,
        User.department_id == head.department_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="This member was not found in your department.")

    member.name = data.name
    member.email = data.email
    if data.password:
        member.password_hash = hash_password(data.password)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/members/{user_id}")
def delete_member(
    user_id: int,
    db: Session = Depends(get_db),
    head = Depends(require_department_head),
):
    member = db.query(User).filter(
        User.id == user_id,
        User.department_id == head.department_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="This member was not found in your department.")

    db.delete(member)
    db.commit()
    return {"message": "Member deleted successfully."}