from pydantic_settings import BaseSettings
from urllib.parse import quote_plus

import os

class Settings(BaseSettings):
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str

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
    def DATABASE_URL(self) -> str:
        encoded_password = quote_plus(self.DB_PASSWORD)
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{encoded_password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?sslmode=require"
        )


settings = Settings()
