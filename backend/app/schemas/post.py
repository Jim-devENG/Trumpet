from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserResponse

class PostBase(BaseModel):
    content: str
    image_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class PostResponse(PostBase):
    id: str
    author_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: UserResponse
    likes_count: int = 0
    comments_count: int = 0

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: str
    content: str
    post_id: str
    author_id: str
    created_at: datetime
    author: UserResponse

    class Config:
        from_attributes = True

class LikeResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
