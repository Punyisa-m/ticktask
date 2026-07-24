from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.database import get_db, set_current_user
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.task import Task
from app.models.chunk import RequirementChunk
from app.security import get_current_user
from app import schemas
from app.services.ai_service import analyze_requirement, client, classify_intent
from app.services.rag_service import chunk_text, embed_text

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
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    new_requirement = Requirement(
        project_id=project_id,
        raw_text=data.raw_text,
    )
    db.add(new_requirement)
    db.commit()
    db.refresh(new_requirement)

    # แบ่ง text เป็น chunk แล้วสร้าง embedding เก็บลง DB
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
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    return db.query(Requirement).filter(Requirement.project_id == project_id).all()


@router.post("/{project_id}/requirements/{requirement_id}/analyze")
def analyze(
    project_id: int,
    requirement_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.project_id == project_id
    ).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="ไม่พบ requirement นี้")

    tasks = analyze_requirement(requirement.raw_text)
    return {"suggested_tasks": tasks}


@router.post("/{project_id}/requirements/{requirement_id}/tasks/confirm", response_model=list[schemas.TaskResponse])
def confirm_tasks(
    project_id: int,
    requirement_id: int,
    data: schemas.TaskConfirmRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    requirement = db.query(Requirement).filter(
        Requirement.id == requirement_id,
        Requirement.project_id == project_id
    ).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="ไม่พบ requirement นี้")

    created_tasks = []
    for task_item in data.tasks:
        new_task = Task(
            project_id=project_id,
            requirement_id=requirement_id,
            title=task_item.title,
            description=task_item.description,
            estimated_hours=task_item.estimated_hours,
            priority=task_item.priority,
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
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="ไม่พบ project นี้")

    # Intent classification ก่อนเข้า RAG pipeline
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

    # ต่อจากนี้คือ RAG pipeline เดิม (intent == "question")
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
        return {"answer": "ยังไม่มีข้อมูล requirement ใน project นี้ให้ค้นหาครับ", "sources": [], "intent": "question"}

    if top_chunks[0]["score"] < 0.4:
        return {
            "answer": "ข้อมูลที่มีอาจไม่เพียงพอต่อการตอบคำถามนี้อย่างมั่นใจ ลองถามให้เจาะจงมากขึ้น หรือเพิ่ม requirement ที่เกี่ยวข้อง",
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