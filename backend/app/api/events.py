from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.event import Event, EventAttendee
from app.schemas.event import EventCreate, EventResponse, EventAttendeeCreate, EventAttendeeResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=EventResponse)
async def create_event(
    event: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_event = Event(
        id=str(uuid.uuid4()),
        title=event.title,
        description=event.description,
        location=event.location,
        date=event.date,
        max_attendees=event.max_attendees,
        image_url=event.image_url,
        organizer_id=current_user.id
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event

@router.get("/", response_model=List[EventResponse])
async def get_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    location: Optional[str] = None,
    occupation: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Event).filter(Event.date >= datetime.now())
    
    if location:
        query = query.filter(Event.location.ilike(f"%{location}%"))
    
    if occupation:
        query = query.join(User, Event.organizer_id == User.id).filter(User.occupation == occupation)
    
    events = query.order_by(Event.date).offset(skip).limit(limit).all()
    return events

@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.post("/{event_id}/attend", response_model=EventAttendeeResponse)
async def attend_event(
    event_id: str,
    attendance: EventAttendeeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already attending
    existing_attendance = db.query(EventAttendee).filter(
        EventAttendee.event_id == event_id,
        EventAttendee.user_id == current_user.id
    ).first()
    
    if existing_attendance:
        existing_attendance.status = attendance.status
        db.commit()
        db.refresh(existing_attendance)
        return existing_attendance
    else:
        attendee = EventAttendee(
            id=str(uuid.uuid4()),
            event_id=event_id,
            user_id=current_user.id,
            status=attendance.status
        )
        db.add(attendee)
        db.commit()
        db.refresh(attendee)
        return attendee
