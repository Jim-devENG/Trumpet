#!/bin/bash

echo "🚀 Starting Trumpet Backend..."

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "🌱 Seeding database..."
python seed_db.py

echo "🚀 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
