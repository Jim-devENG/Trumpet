from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
import uuid
import json

from app.core.database import get_db
from app.models.user import User
from app.models.post import Post, Comment, Like
from app.schemas.post import PostCreate, PostResponse, CommentCreate, CommentResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_post = Post(
        id=str(uuid.uuid4()),
        content=post.content,
        image_url=post.image_url,
        author_id=current_user.id
    )
    
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    # Get post with author info
    post_with_author = db.query(Post).filter(Post.id == db_post.id).first()
    return post_with_author

@router.get("/", response_model=List[PostResponse])
async def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    occupation: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Post)
    
    if occupation or location:
        query = query.join(User, Post.author_id == User.id)
        if occupation:
            query = query.filter(User.occupation == occupation)
        if location:
            query = query.filter(User.location.ilike(f"%{location}%"))
    
    posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()
    return posts

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.post("/{post_id}/like")
async def like_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already liked
    existing_like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.user_id == current_user.id
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        db.commit()
        return {"message": "Post unliked", "liked": False}
    else:
        like = Like(
            id=str(uuid.uuid4()),
            post_id=post_id,
            user_id=current_user.id
        )
        db.add(like)
        db.commit()
        return {"message": "Post liked", "liked": True}

@router.post("/{post_id}/comments", response_model=CommentResponse)
async def add_comment(
    post_id: str,
    comment: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db_comment = Comment(
        id=str(uuid.uuid4()),
        content=comment.content,
        post_id=post_id,
        author_id=current_user.id
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    
    return db_comment
