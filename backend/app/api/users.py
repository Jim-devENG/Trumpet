from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
import json

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    occupation: Optional[str] = None,
    location: Optional[str] = None,
    interests: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    if occupation:
        query = query.filter(User.occupation == occupation)
    
    if location:
        query = query.filter(User.location.ilike(f"%{location}%"))
    
    if interests:
        interest_list = interests.split(",")
        for interest in interest_list:
            query = query.filter(User.interests.ilike(f"%{interest}%"))
    
    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/search/{query}", response_model=List[UserResponse])
async def search_users(
    query: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        or_(
            User.username.ilike(f"%{query}%"),
            User.first_name.ilike(f"%{query}%"),
            User.last_name.ilike(f"%{query}%"),
            User.occupation.ilike(f"%{query}%"),
            User.location.ilike(f"%{query}%")
        )
    ).order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    
    return users
