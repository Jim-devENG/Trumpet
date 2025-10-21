from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserResponse

class EventBase(BaseModel):
    title: str
    description: str
    location: str
    date: datetime
    max_attendees: Optional[int] = None
    image_url: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    organizer_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    organizer: UserResponse
    attendees_count: int = 0

    class Config:
        from_attributes = True

class EventAttendeeCreate(BaseModel):
    status: str = "attending"  # attending, maybe, not_attending

class EventAttendeeResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    status: str
    created_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True
