"""
Application settings module.

Loads environment variables from the .env file and provides configuration
values based on the current environment (DEV/production).
"""

from datetime import timedelta
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    ENV: str = "dev"
    DATABASE_URL: str
    JWT_SECRET: SecretStr
    GEMINI_API_KEY: SecretStr | None = None
    UPLOAD_DIR: str = "uploads"
    ENCODING_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: timedelta = timedelta(hours=24)
    MAX_FILE_SIZE: int = 10 * 1024 * 1024 # 10 MB
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

settings = Settings()
