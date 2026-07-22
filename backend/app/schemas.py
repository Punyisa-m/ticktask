from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # "manager" หรือ "member"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    
class ProjectCreate(BaseModel):
    name: str
    description: str | None = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    status: str

    class Config:
        from_attributes = True
        
class RequirementResponse(BaseModel):
    id: int
    project_id: int
    file_path: str | None
    raw_text: str | None

    class Config:
        from_attributes = True