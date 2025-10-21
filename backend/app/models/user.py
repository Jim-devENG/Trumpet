from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    occupation = Column(String, nullable=False)
    interests = Column(Text, nullable=False)  # JSON string
    location = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    likes = relationship("Like", back_populates="user")
    events_organized = relationship("Event", back_populates="organizer")
    event_attendances = relationship("EventAttendee", back_populates="user")
    jobs_posted = relationship("Job", back_populates="poster")
    job_applications = relationship("JobApplication", back_populates="user")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    messages_received = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    notifications = relationship("Notification", back_populates="user")
    connections_initiated = relationship("Connection", foreign_keys="Connection.requester_id", back_populates="requester")
    connections_received = relationship("Connection", foreign_keys="Connection.receiver_id", back_populates="receiver")
