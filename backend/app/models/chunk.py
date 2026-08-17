from sqlalchemy import Column, Integer, ForeignKey, Text
from pgvector.sqlalchemy import Vector
from app.database import Base

class RequirementChunk(Base):
    __tablename__ = "requirement_chunks"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(384)) 