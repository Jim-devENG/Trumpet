from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.message import Message
from app.schemas.message import MessageCreate, MessageResponse, ConversationResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=MessageResponse)
async def send_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if receiver exists
    receiver = db.query(User).filter(User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    db_message = Message(
        id=str(uuid.uuid4()),
        content=message.content,
        sender_id=current_user.id,
        receiver_id=message.receiver_id
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get all messages where user is sender or receiver
    messages = db.query(Message).filter(
        or_(
            Message.sender_id == current_user.id,
            Message.receiver_id == current_user.id
        )
    ).order_by(desc(Message.created_at)).all()
    
    # Group by conversation partner
    conversations = {}
    for message in messages:
        partner_id = message.sender_id if message.sender_id != current_user.id else message.receiver_id
        if partner_id not in conversations:
            partner = db.query(User).filter(User.id == partner_id).first()
            conversations[partner_id] = {
                "user": partner,
                "last_message": message,
                "unread_count": 0
            }
        
        if message.receiver_id == current_user.id and not message.is_read:
            conversations[partner_id]["unread_count"] += 1
    
    return list(conversations.values())

@router.get("/{user_id}", response_model=List[MessageResponse])
async def get_messages(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    messages = db.query(Message).filter(
        or_(
            (Message.sender_id == current_user.id) & (Message.receiver_id == user_id),
            (Message.sender_id == user_id) & (Message.receiver_id == current_user.id)
        )
    ).order_by(desc(Message.created_at)).offset(skip).limit(limit).all()
    
    # Mark messages as read
    db.query(Message).filter(
        Message.sender_id == user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return list(reversed(messages))
