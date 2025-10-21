from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .user import UserResponse

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    receiver_id: str

class MessageResponse(MessageBase):
    id: str
    sender_id: str
    receiver_id: str
    is_read: bool
    created_at: datetime
    sender: UserResponse
    receiver: UserResponse

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    user: UserResponse
    last_message: MessageResponse
    unread_count: int = 0
