from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.database import get_db, set_current_user
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.task import Task
from app.models.chunk import RequirementChunk
from app.security import get_current_user, require_department_head
from app import schemas
from app.services.ai_service import analyze_requirement, client, classify_intent, recommend_assignee
from app.services.rag_service import chunk_text, embed_text
from app.models.user import User
from app.models.skill import UserSkill, Skill
from app.models.project_member import ProjectMember

router = APIRouter(prefix="/projects", tags=["requirements"])

class RequirementCreate(BaseModel):
    raw_text: str

class ChatRequest(BaseModel):
    question: str


@router.post("/{project_id}/requirements", response_model=schemas.RequirementResponse)
def create_requirement(
    project_id: int,
    data: RequirementCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    new_requirement = Requirement(
        project_id=project_id,
        raw_text=data.raw_text,
    )
    db.add(new_requirement)
    db.commit()
    db.refresh(new_requirement)

    # Split the text into chunks, generate embeddings, and store them in the database.
    text_chunks = chunk_text(data.raw_text)
    for chunk_str in text_chunks:
        vector = embed_text(chunk_str)
        new_chunk = RequirementChunk(
            requirement_id=new_requirement.id,
            project_id=project_id,
            chunk_text=chunk_str,
            embedding=vector,
        )
        db.add(new_chunk)
    db.commit()

    return new_requirement


@router.get("/{project_id}/requirements", response_model=list[schemas.RequirementResponse])
def list_requirements(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    return db.query(Requirement).filter(Requirement.project_id == project_id).all()


@router.post("/{project_id}/requirements/{requirement_id}/analyze")
def analyze(
    project_id: int,
    requirement_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.project_id == project_id
    ).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found.")

    tasks = analyze_requirement(requirement.raw_text)
    return {"suggested_tasks": tasks}

@router.post("/{project_id}/requirements/{requirement_id}/tasks/suggest-assignments")
def suggest_assignments(
    project_id: int,
    requirement_id: int,
    data: schemas.TaskConfirmRequest,  # Receive the list of tasks generated (or edited) by the AI.
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Fetch all members of this project (not the entire system).
    members = (
        db.query(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )

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
        raise HTTPException(status_code=400, detail="There are no members in this project to select.")

    results = []
    for task_item in data.tasks:
        recommendation = recommend_assignee(task_item.title, task_item.description or "", candidates)
        results.append({
            "title": task_item.title,
            "description": task_item.description,
            "estimated_hours": task_item.estimated_hours,
            "priority": task_item.priority,
            "recommended_user_id": recommendation.get("user_id"),
            "reason": recommendation.get("reason"),
        })

    return {"tasks_with_recommendations": results, "candidates": candidates}


@router.post("/{project_id}/requirements/{requirement_id}/tasks/confirm", response_model=list[schemas.TaskResponse])
def confirm_tasks(
    project_id: int,
    requirement_id: int,
    data: schemas.TaskConfirmRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_department_head), 
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.project_id == project_id
    ).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    created_tasks = []
    for task_item in data.tasks:
        new_task = Task(
            project_id=project_id,
            requirement_id=requirement_id,
            title=task_item.title,
            description=task_item.description,
            estimated_hours=task_item.estimated_hours,
            priority=task_item.priority,
            assigned_to=task_item.assigned_to,  
            status="todo",
        )
        db.add(new_task)
        created_tasks.append(new_task)

    db.commit()
    for task in created_tasks:
        db.refresh(task)

    return created_tasks


@router.post("/{project_id}/chat")
def chat_with_project(
    project_id: int,
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Intent classification Before entering the RAG pipeline.
    intent = classify_intent(data.question)

    if intent == "greeting":
        response = client.chat.completions.create(
            model="typhoon-v2.5-30b-a3b-instruct",
            messages=[{"role": "user", "content": f"ตอบกลับข้อความนี้แบบเป็นมิตร สั้น กระชับ: {data.question}"}],
            temperature=0.5,
            max_tokens=100,
        )
        return {
            "answer": response.choices[0].message.content.strip(),
            "sources": [],
            "intent": "greeting",
        }

    set_current_user(db, current_user.id)

    query_vector = embed_text(data.question)

    result = db.execute(
        text("""
            SELECT chunk_text, 1 - (embedding <=> :query_vector) AS similarity
            FROM requirement_chunks
            WHERE project_id = :project_id
            ORDER BY embedding <=> :query_vector
            LIMIT 3
        """),
        {"query_vector": str(query_vector), "project_id": project_id}
    )
    top_chunks = [{"chunk_text": row[0], "score": row[1]} for row in result]

    if not top_chunks:
        return {"answer": "There is no requirement data available to search in this project.", "sources": [], "intent": "question"}

    if top_chunks[0]["score"] < 0.4:
        return {
            "answer": "The available information may not be sufficient to answer this question with confidence. Try asking a more specific question or add relevant requirements.",
            "sources": [{"chunk_text": c["chunk_text"], "relevance_score": round(c["score"], 3)} for c in top_chunks],
            "intent": "question",
        }

    context = "\n\n".join(f"- {c['chunk_text']}" for c in top_chunks)

    prompt = f"""ใช้ข้อมูลต่อไปนี้ตอบคำถาม ถ้าข้อมูลไม่พอให้บอกว่าไม่มีข้อมูลเพียงพอ

ข้อมูลอ้างอิง:
{context}

คำถาม: {data.question}

ตอบเป็นภาษาไทย กระชับ ตรงประเด็น"""

    response = client.chat.completions.create(
        model="typhoon-v2.5-30b-a3b-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content.strip()

    return {
        "answer": answer,
        "sources": [{"chunk_text": c["chunk_text"], "relevance_score": round(c["score"], 3)} for c in top_chunks],
        "intent": "question",
    }