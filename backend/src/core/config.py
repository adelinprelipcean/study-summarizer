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

settings = Settings()
