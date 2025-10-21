#!/usr/bin/env python3
"""
Simple runner for Trumpet API without Docker
"""
import subprocess
import sys
import os

def install_requirements():
    """Install requirements if not already installed"""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        print("✅ Dependencies already installed")
        return True
    except ImportError:
        print("📦 Installing dependencies...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements-simple.txt"])
            print("✅ Dependencies installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            return False

def seed_database():
    """Seed the database"""
    print("🌱 Seeding database...")
    try:
        subprocess.check_call([sys.executable, "seed_db.py"])
        print("✅ Database seeded successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to seed database: {e}")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting FastAPI server...")
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

if __name__ == "__main__":
    print("🚀 Starting Trumpet Backend (Simple Mode)")
    
    if not install_requirements():
        sys.exit(1)
    
    if not seed_database():
        print("⚠️  Continuing without seeding...")
    
    start_server()
