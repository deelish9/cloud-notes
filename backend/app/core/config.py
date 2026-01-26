from pydantic_settings import BaseSettings
from urllib.parse import quote_plus

import os

class Settings(BaseSettings):
    # If DATABASE_URL is provided (e.g. by Railway/Render), use it directly.
    # Otherwise, build it from components (Local dev).
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")
    
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "cloud_notes"

    CLERK_ISSUER: str | None = None
    CLERK_JWKS_URL: str | None = None
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    GCS_KEY_PATH: str = os.getenv("GCS_KEY_PATH", "/code/gcs-key.json")
    GCS_BUCKET_NAME: str | None = os.getenv("GCS_BUCKET_NAME")

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            # Fix for SQLAlchemy requiring postgresql:// instead of postgres://
            return self.DATABASE_URL.replace("postgres://", "postgresql://")
            
        encoded_password = quote_plus(self.DB_PASSWORD)
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{encoded_password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

settings = Settings()
