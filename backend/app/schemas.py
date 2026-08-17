from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str 

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department_id: int | None = None

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
        

class TaskItem(BaseModel):
    title: str
    description: str | None = None
    estimated_hours: float | None = None
    priority: str = "medium"
    assigned_to: int | None = None

class TaskConfirmRequest(BaseModel):
    tasks: list[TaskItem]

class TaskResponse(BaseModel):
    id: int
    project_id: int
    requirement_id: int | None
    title: str
    description: str | None
    assigned_to: int | None
    status: str
    estimated_hours: float | None
    priority: str

    class Config:
        from_attributes = True
        
class SkillCreate(BaseModel):
    name: str

class SkillResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class UserSkillCreate(BaseModel):
    skill_id: int
    level: int = 1

class UserSkillResponse(BaseModel):
    id: int
    user_id: int
    skill_id: int
    level: int

    class Config:
        from_attributes = True