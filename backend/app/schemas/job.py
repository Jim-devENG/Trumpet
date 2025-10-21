from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserResponse

class JobBase(BaseModel):
    title: str
    description: str
    company: str
    location: str
    type: str  # full-time, part-time, contract, internship
    salary: Optional[str] = None
    requirements: Optional[List[str]] = None
    benefits: Optional[List[str]] = None

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: str
    poster_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    poster: UserResponse
    applications_count: int = 0

    class Config:
        from_attributes = True

class JobApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None

class JobApplicationResponse(BaseModel):
    id: str
    job_id: str
    user_id: str
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: UserResponse

    class Config:
        from_attributes = True
