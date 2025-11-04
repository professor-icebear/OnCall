from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

Base = declarative_base()

class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(Integer, primary_key=True)
    owner = Column(String, nullable=False)
    name = Column(String, nullable=False)
    default_branch = Column(String, default="main")
    railway_project_name = Column(String, nullable=True)  # Railway project name
    github_webhook_id = Column(String, nullable=True)
    access_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    documents = relationship("Document", back_populates="repository")
    investigations = relationship("Investigation", back_populates="repository")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content = Column(Text)
    file_type = Column(String)  # pdf, md, txt
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    repository = relationship("Repository", back_populates="documents")

class Investigation(Base):
    __tablename__ = "investigations"
    
    id = Column(Integer, primary_key=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    status = Column(String, default="pending")  # pending, investigating, completed, failed
    alert_message = Column(Text)
    error_message = Column(Text)
    deployment_logs = Column(Text)
    commit_sha = Column(String)
    root_cause = Column(Text)
    suggested_fix = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    repository = relationship("Repository", back_populates="investigations")
    steps = relationship("InvestigationStep", back_populates="investigation")

class InvestigationStep(Base):
    __tablename__ = "investigation_steps"
    
    id = Column(Integer, primary_key=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id"))
    step_number = Column(Integer)
    description = Column(Text)
    status = Column(String)  # in_progress, completed, failed
    details = Column(Text)  # JSON with additional info
    created_at = Column(DateTime, default=datetime.utcnow)
    
    investigation = relationship("Investigation", back_populates="steps")

# Database setup
engine = create_engine("sqlite:///./oncall.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
