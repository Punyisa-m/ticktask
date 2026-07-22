from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.skill import Skill, UserSkill
from app.security import get_current_user
from app import schemas

router = APIRouter(tags=["skills"])

@router.post("/skills", response_model=schemas.SkillResponse)
def create_skill(
    data: schemas.SkillCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    existing = db.query(Skill).filter(Skill.name == data.name).first()
    if existing:
        return existing

    new_skill = Skill(name=data.name)
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill


@router.get("/skills", response_model=list[schemas.SkillResponse])
def list_skills(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return db.query(Skill).all()


@router.post("/users/{user_id}/skills", response_model=schemas.UserSkillResponse)
def add_user_skill(
    user_id: int,
    data: schemas.UserSkillCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    new_user_skill = UserSkill(
        user_id=user_id,
        skill_id=data.skill_id,
        level=data.level,
    )
    db.add(new_user_skill)
    db.commit()
    db.refresh(new_user_skill)
    return new_user_skill


@router.get("/users/{user_id}/skills", response_model=list[schemas.UserSkillResponse])
def list_user_skills(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return db.query(UserSkill).filter(UserSkill.user_id == user_id).all()