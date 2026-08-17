from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app import schemas, security
from app.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if a Super Admin already exists.
    existing_superadmin = db.query(User).filter(User.role == "superadmin").first()
    if existing_superadmin:
        raise HTTPException(
            status_code=403,
            detail="A Super Admin already exists in the system. Independent registration is no longer available. Please contact the Super Admin or your department head."
        )

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already in use.")

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=security.hash_password(user_data.password),
        role="superadmin",  # The first person to register will always be assigned as the Super Admin.
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not security.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = security.create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user = Depends(get_current_user)):
    return current_user