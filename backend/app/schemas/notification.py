from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class NotificationBase(BaseModel):
    type: str  # like, comment, connection, event, job
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None

class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
