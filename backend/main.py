from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import asyncio
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from database import init_db, get_db, Repository, Investigation, InvestigationStep, Document
from agent.investigator import investigator
from integrations.railway import railway_client

app = FastAPI(title="On-Call Agent API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, investigation_id: str):
        await websocket.accept()
        if investigation_id not in self.active_connections:
            self.active_connections[investigation_id] = []
        self.active_connections[investigation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, investigation_id: str):
        if investigation_id in self.active_connections:
            self.active_connections[investigation_id].remove(websocket)

    async def send_message(self, investigation_id: str, message: dict):
        if investigation_id in self.active_connections:
            for connection in self.active_connections[investigation_id]:
                await connection.send_json(message)

manager = ConnectionManager()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    # Start Railway monitoring task
    asyncio.create_task(monitor_railway_deployments())

async def monitor_railway_deployments():
    """Background task to periodically check Railway deployment status"""
    await asyncio.sleep(10)  # Wait for app to fully start
    print("🚀 Railway monitoring task started")
    
    last_checked = {}  # Track last deployment status per repo
    
    while True:
        try:
            if not railway_client:
                print("⚠️  Railway client not configured. Add RAILWAY_API_KEY to .env")
                await asyncio.sleep(300)
                continue
            
            # Get all repos with Railway project names
            db = next(get_db())
            try:
                repos = db.query(Repository).filter(
                    Repository.railway_project_name.isnot(None)
                ).all()
                
                if not repos:
                    await asyncio.sleep(60)
                    continue
                
                for repo in repos:
                    try:
                        # Get project by name
                        project = railway_client.get_project_by_name(repo.railway_project_name)
                        if not project:
                            print(f"⚠️  Railway project '{repo.railway_project_name}' not found")
                            continue
                        
                        # Get latest deployment
                        deployment = railway_client.get_deployment_status(project["id"])
                        if not deployment:
                            continue
                        
                        deployment_status = deployment.get("status", "").lower()
                        deployment_id = deployment.get("id")
                        
                        # Check if we've seen this deployment before
                        last_status = last_checked.get(repo.id, {})
                        
                        if last_status.get("id") != deployment_id and deployment_status in ["failed", "crashed"]:
                            # New failed/crashed deployment detected!
                            print(f"🔴 Deployment {deployment_status.upper()} for {repo.owner}/{repo.name}")
                            
                            # Trigger investigation automatically
                            error_message = deployment.get("error", f"Railway deployment {deployment_status}")
                            
                            # Create investigation in new session
                            db_inv = next(get_db())
                            try:
                                investigation = Investigation(
                                    repository_id=repo.id,
                                    status="investigating",
                                    error_message=f"Railway deployment {deployment_status}: {error_message}",
                                    deployment_logs=error_message,
                                    commit_sha=""  # Could get from deployment metadata
                                )
                                db_inv.add(investigation)
                                db_inv.commit()
                                db_inv.refresh(investigation)
                                
                                investigation_id = investigation.id
                                
                                print(f"🔍 Starting auto-investigation #{investigation_id}")
                                
                                # Run investigation in background with new session
                                async def run_auto_investigation():
                                    db_task = next(get_db())
                                    try:
                                        await run_investigation(
                                            investigation_id,
                                            repo,
                                            error_message,
                                            error_message,
                                            "",
                                            db_task
                                        )
                                    finally:
                                        db_task.close()
                                
                                asyncio.create_task(run_auto_investigation())
                            finally:
                                db_inv.close()
                            
                            # Update last checked
                            last_checked[repo.id] = {"id": deployment_id, "status": deployment_status}
                        else:
                            # Update tracking
                            last_checked[repo.id] = {"id": deployment_id, "status": deployment_status}
                            
                    except Exception as e:
                        print(f"Error checking repo {repo.id}: {e}")
            finally:
                db.close()
            
            await asyncio.sleep(60)  # Check every minute
                
        except Exception as e:
            print(f"Monitoring error: {e}")
            await asyncio.sleep(60)

@app.get("/")
async def root():
    return {"message": "On-Call Agent API"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/railway/debug")
async def debug_railway():
    """Debug endpoint to list Railway projects"""
    if not railway_client:
        return {"error": "Railway client not configured. Add RAILWAY_API_KEY to .env"}
    
    print("Debug: Calling list_all_projects()...")
    projects = railway_client.list_all_projects()
    print(f"Debug: Got {len(projects)} projects: {projects}")
    
    return {
        "configured": True,
        "projects": projects,
        "count": len(projects)
    }

# Railway webhook endpoint
@app.post("/api/webhooks/railway")
async def railway_webhook(request: dict):
    """Receive Railway deployment webhooks"""
    try:
        event_type = request.get("event")
        
        if event_type == "deployment.failed":
            # Extract deployment info
            deployment = request.get("data", {})
            error_message = deployment.get("error", "Deployment failed")
            project_id = deployment.get("project_id")
            commit_sha = deployment.get("commit_sha")
            
            # Find repository associated with this Railway project
            # For now, we'll trigger investigation manually
            # In production, you'd match project_id to your repos
            
            return {"status": "received"}
            
    except Exception as e:
        print(f"Webhook error: {e}")
    
    return {"status": "received"}

# Repositories endpoints
@app.post("/api/repositories")
async def create_repository(
    owner: str = Form(...),
    name: str = Form(...),
    default_branch: str = Form("main"),
    railway_project_name: Optional[str] = Form(None),
    access_token: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create or get a repository connection"""
    repo = db.query(Repository).filter(
        Repository.owner == owner,
        Repository.name == name
    ).first()
    
    if not repo:
        repo = Repository(
            owner=owner,
            name=name,
            default_branch=default_branch,
            railway_project_name=railway_project_name,
            access_token=access_token
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
    
    return {
        "id": repo.id,
        "owner": repo.owner,
        "name": repo.name,
        "default_branch": repo.default_branch
    }

@app.get("/api/repositories")
async def list_repositories(db: Session = Depends(get_db)):
    """Get all repositories"""
    repos = db.query(Repository).all()
    return [{
        "id": repo.id,
        "owner": repo.owner,
        "name": repo.name,
        "default_branch": repo.default_branch,
        "railway_project_name": repo.railway_project_name,
        "created_at": repo.created_at.isoformat() if repo.created_at else None
    } for repo in repos]

@app.get("/api/repositories/{repo_id}")
async def get_repository(repo_id: int, db: Session = Depends(get_db)):
    """Get repository by ID"""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    return {
        "id": repo.id,
        "owner": repo.owner,
        "name": repo.name,
        "default_branch": repo.default_branch,
        "created_at": repo.created_at.isoformat()
    }

# Document upload endpoint
@app.post("/api/repositories/{repo_id}/documents")
async def upload_document(
    repo_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload documentation for a repository"""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Save file
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{repo_id}_{file.filename}"
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Extract text content
    text_content = ""
    if file.filename.endswith(".pdf"):
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(file_path)
            text_content = "\n".join([page.extract_text() for page in pdf_reader.pages])
        except:
            pass
    elif file.filename.endswith((".md", ".txt")):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text_content = f.read()
        except:
            pass
    
    # Save to database
    doc = Document(
        repository_id=repo_id,
        filename=file.filename,
        file_path=file_path,
        content=text_content,
        file_type=file.filename.split(".")[-1]
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "uploaded_at": doc.uploaded_at.isoformat()
    }

@app.get("/api/repositories/{repo_id}/documents")
async def get_documents(repo_id: int, db: Session = Depends(get_db)):
    """Get all documents for a repository"""
    docs = db.query(Document).filter(Document.repository_id == repo_id).all()
    return [{
        "id": d.id,
        "filename": d.filename,
        "file_type": d.file_type,
        "uploaded_at": d.uploaded_at.isoformat()
    } for d in docs]

# Investigation endpoints
@app.post("/api/repositories/{repo_id}/investigate")
async def start_investigation(
    repo_id: int,
    error_message: str = Form(...),
    deployment_logs: str = Form(""),
    commit_sha: str = Form(""),
    db: Session = Depends(get_db)
):
    """Start an investigation"""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not investigator:
        raise HTTPException(status_code=500, detail="Investigator not configured")
    
    # Create investigation record
    investigation = Investigation(
        repository_id=repo_id,
        status="investigating",
        error_message=error_message,
        deployment_logs=deployment_logs,
        commit_sha=commit_sha
    )
    db.add(investigation)
    db.commit()
    db.refresh(investigation)
    
    # Start investigation in background
    asyncio.create_task(run_investigation(investigation.id, repo, error_message, deployment_logs, commit_sha, db))
    
    return {
        "investigation_id": investigation.id,
        "status": "investigating"
    }

async def run_investigation(
    investigation_id: int,
    repo: Repository,
    error_message: str,
    deployment_logs: str,
    commit_sha: str,
    db: Session
):
    """Run investigation in background"""
    try:
        print(f"Starting investigation {investigation_id} for repo {repo.owner}/{repo.name}")
        
        # Get documents
        docs = db.query(Document).filter(Document.repository_id == repo.id).all()
        doc_contents = [d.content for d in docs if d.content]
        print(f"Loaded {len(doc_contents)} documents")
        
        if not investigator:
            raise ValueError("Investigator not initialized. Check API keys in .env file")
        
        # Run investigation
        result = await investigator.investigate(
            investigation_id=str(investigation_id),
            repo_owner=repo.owner,
            repo_name=repo.name,
            error_message=error_message,
            deployment_logs=deployment_logs,
            commit_sha=commit_sha,
            documents=doc_contents,
            websocket_manager=manager
        )
        
        print(f"Investigation {investigation_id} completed with result: {result}")
        
        # Update investigation
        investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if investigation:
            investigation.status = "completed"
            investigation.root_cause = result.get("root_cause", "")[:1000]  # Limit length
            investigation.suggested_fix = result.get("suggested_fix", "")[:2000]  # Limit length
            investigation.completed_at = datetime.utcnow()
            db.commit()
            
    except Exception as e:
        import traceback
        error_msg = f"Investigation error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        
        investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if investigation:
            investigation.status = "failed"
            investigation.root_cause = f"Error: {str(e)}"
            db.commit()

@app.get("/api/investigations")
async def list_investigations(db: Session = Depends(get_db)):
    """Get all investigations"""
    investigations = db.query(Investigation).order_by(Investigation.created_at.desc()).limit(50).all()
    return [{
        "id": inv.id,
        "status": inv.status,
        "error_message": inv.error_message,
        "alert_message": inv.alert_message,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "completed_at": inv.completed_at.isoformat() if inv.completed_at else None,
        "repository_id": inv.repository_id
    } for inv in investigations]

@app.get("/api/investigations/{investigation_id}")
async def get_investigation(investigation_id: int, db: Session = Depends(get_db)):
    """Get investigation details"""
    investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    return {
        "id": investigation.id,
        "status": investigation.status,
        "error_message": investigation.error_message,
        "root_cause": investigation.root_cause,
        "suggested_fix": investigation.suggested_fix,
        "created_at": investigation.created_at.isoformat() if investigation.created_at else None,
        "completed_at": investigation.completed_at.isoformat() if investigation.completed_at else None
    }

@app.websocket("/ws/investigation/{investigation_id}")
async def websocket_endpoint(websocket: WebSocket, investigation_id: str):
    await manager.connect(websocket, investigation_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo for now
            await websocket.send_json({"message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, investigation_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
