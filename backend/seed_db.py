#!/usr/bin/env python3
"""
Database seeding script for Trumpet API
"""
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.core.database import SessionLocal, engine
from app.core.config import settings
from app.models.user import User
from app.models.post import Post
from app.models.event import Event
from app.models.job import Job

# Create tables
from app.models import *
Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_database():
    db = SessionLocal()
    
    try:
        print("🌱 Starting database seeding...")
        
        # Create sample users
        users_data = [
            {
                "email": "john@example.com",
                "username": "john_doe",
                "first_name": "John",
                "last_name": "Doe",
                "occupation": "government",
                "interests": ["music", "tech", "fitness"],
                "location": "New York",
                "bio": "Government official passionate about technology and music.",
                "is_verified": True,
                "is_premium": True,
                "level": 5,
                "experience": 2500
            },
            {
                "email": "jane@example.com",
                "username": "jane_smith",
                "first_name": "Jane",
                "last_name": "Smith",
                "occupation": "arts",
                "interests": ["art", "music", "photography"],
                "location": "London",
                "bio": "Creative artist exploring new forms of expression.",
                "is_verified": True,
                "is_premium": True,
                "level": 3,
                "experience": 1200
            },
            {
                "email": "mike@example.com",
                "username": "mike_wilson",
                "first_name": "Mike",
                "last_name": "Wilson",
                "occupation": "economy",
                "interests": ["tech", "fitness", "books"],
                "location": "Tokyo",
                "bio": "Business professional with a passion for technology and fitness.",
                "is_verified": True,
                "is_premium": False,
                "level": 2,
                "experience": 800
            }
        ]
        
        users = []
        for user_data in users_data:
            user = User(
                id=str(uuid.uuid4()),
                email=user_data["email"],
                username=user_data["username"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                password_hash=pwd_context.hash("password123"),
                occupation=user_data["occupation"],
                interests=json.dumps(user_data["interests"]),
                location=user_data["location"],
                bio=user_data["bio"],
                is_verified=user_data["is_verified"],
                is_premium=user_data["is_premium"],
                level=user_data["level"],
                experience=user_data["experience"]
            )
            db.add(user)
            users.append(user)
        
        db.commit()
        print(f"✅ Created {len(users)} users")
        
        # Create sample posts
        posts_data = [
            {
                "content": "Excited to announce our new government tech initiative! Looking forward to connecting with fellow tech enthusiasts.",
                "author_id": users[0].id
            },
            {
                "content": "Just finished my latest art piece. The creative process never ceases to amaze me!",
                "author_id": users[1].id
            },
            {
                "content": "Great networking event today. Met some amazing people in the business community!",
                "author_id": users[2].id
            }
        ]
        
        posts = []
        for post_data in posts_data:
            post = Post(
                id=str(uuid.uuid4()),
                content=post_data["content"],
                author_id=post_data["author_id"]
            )
            db.add(post)
            posts.append(post)
        
        db.commit()
        print(f"✅ Created {len(posts)} posts")
        
        # Create sample events
        events_data = [
            {
                "title": "Tech Innovation Summit",
                "description": "Join us for a day of discussions about the future of technology in government.",
                "location": "New York Convention Center",
                "date": datetime.now() + timedelta(days=30),
                "max_attendees": 100,
                "organizer_id": users[0].id
            },
            {
                "title": "Art Gallery Opening",
                "description": "Come celebrate the opening of our new contemporary art exhibition.",
                "location": "London Art Gallery",
                "date": datetime.now() + timedelta(days=45),
                "max_attendees": 50,
                "organizer_id": users[1].id
            }
        ]
        
        events = []
        for event_data in events_data:
            event = Event(
                id=str(uuid.uuid4()),
                title=event_data["title"],
                description=event_data["description"],
                location=event_data["location"],
                date=event_data["date"],
                max_attendees=event_data["max_attendees"],
                organizer_id=event_data["organizer_id"]
            )
            db.add(event)
            events.append(event)
        
        db.commit()
        print(f"✅ Created {len(events)} events")
        
        # Create sample jobs
        jobs_data = [
            {
                "title": "Senior Software Engineer",
                "description": "We are looking for an experienced software engineer to join our government tech team.",
                "company": "Government Tech Department",
                "location": "New York",
                "type": "full-time",
                "salary": "$80,000 - $120,000",
                "requirements": ["5+ years experience", "React/Node.js", "Government clearance"],
                "benefits": ["Health insurance", "Pension plan", "Flexible hours"],
                "poster_id": users[0].id
            },
            {
                "title": "Creative Director",
                "description": "Lead our creative team in developing innovative art projects.",
                "company": "Creative Studio London",
                "location": "London",
                "type": "full-time",
                "salary": "£50,000 - £70,000",
                "requirements": ["Art degree", "5+ years experience", "Portfolio required"],
                "benefits": ["Creative freedom", "Health insurance", "Professional development"],
                "poster_id": users[1].id
            }
        ]
        
        jobs = []
        for job_data in jobs_data:
            job = Job(
                id=str(uuid.uuid4()),
                title=job_data["title"],
                description=job_data["description"],
                company=job_data["company"],
                location=job_data["location"],
                type=job_data["type"],
                salary=job_data["salary"],
                requirements=json.dumps(job_data["requirements"]),
                benefits=json.dumps(job_data["benefits"]),
                poster_id=job_data["poster_id"]
            )
            db.add(job)
            jobs.append(job)
        
        db.commit()
        print(f"✅ Created {len(jobs)} jobs")
        
        print("🎉 Database seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
