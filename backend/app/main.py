from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth, users, posts, events, jobs, messages, notifications
from app.core.database import engine, Base
from app.core.config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Trumpet API",
    description="Social networking platform for professional communities",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "OK",
        "message": "Trumpet API is running",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Trumpet API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
