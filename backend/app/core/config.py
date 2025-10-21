from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./trumpet.db"
    
    # Security
    SECRET_KEY: str = "trumpet-super-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    FRONTEND_URL: str = "http://localhost:8080"
    
    # Redis
    REDIS_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
