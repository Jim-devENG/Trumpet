from pydantic import BaseModel
from datetime import datetime
from .user import UserResponse

class ConnectionBase(BaseModel):
    receiver_id: str

class ConnectionCreate(ConnectionBase):
    pass

class ConnectionResponse(ConnectionBase):
    id: str
    requester_id: str
    status: str  # pending, accepted, rejected
    created_at: datetime
    updated_at: Optional[datetime] = None
    requester: UserResponse
    receiver: UserResponse

    class Config:
        from_attributes = True
