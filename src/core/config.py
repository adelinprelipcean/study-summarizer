from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, AnyUrl


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    ENV: str = "dev"
    DATABASE_URL: AnyUrl
    JWT_SECRET: SecretStr
    OPENAI_API_KEY: SecretStr | None = None


settings = Settings()
