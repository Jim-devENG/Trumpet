from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import uuid
import json

from app.core.database import get_db
from app.models.user import User
from app.models.job import Job, JobApplication
from app.schemas.job import JobCreate, JobResponse, JobApplicationCreate, JobApplicationResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_job = Job(
        id=str(uuid.uuid4()),
        title=job.title,
        description=job.description,
        company=job.company,
        location=job.location,
        type=job.type,
        salary=job.salary,
        requirements=json.dumps(job.requirements) if job.requirements else None,
        benefits=json.dumps(job.benefits) if job.benefits else None,
        poster_id=current_user.id
    )
    
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    return db_job

@router.get("/", response_model=List[JobResponse])
async def get_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    location: Optional[str] = None,
    type: Optional[str] = None,
    occupation: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Job).filter(Job.is_active == True)
    
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    
    if type:
        query = query.filter(Job.type == type)
    
    if occupation:
        query = query.join(User, Job.poster_id == User.id).filter(User.occupation == occupation)
    
    jobs = query.order_by(desc(Job.created_at)).offset(skip).limit(limit).all()
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{job_id}/apply", response_model=JobApplicationResponse)
async def apply_for_job(
    job_id: str,
    application: JobApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.is_active:
        raise HTTPException(status_code=400, detail="Job is no longer active")
    
    # Check if already applied
    existing_application = db.query(JobApplication).filter(
        JobApplication.job_id == job_id,
        JobApplication.user_id == current_user.id
    ).first()
    
    if existing_application:
        raise HTTPException(status_code=400, detail="You have already applied for this job")
    
    db_application = JobApplication(
        id=str(uuid.uuid4()),
        job_id=job_id,
        user_id=current_user.id,
        cover_letter=application.cover_letter,
        resume_url=application.resume_url
    )
    
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    
    return db_application
