from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    groq_api_key: str
    database_url: str = "sqlite:///./interviews.db"
    # llama-3.1-8b-instant: ultra-low latency for question generation
    # llama-3.3-70b-versatile: higher reasoning quality for summaries
    model_questions: str = "llama-3.1-8b-instant"
    model_summary: str = "llama-3.3-70b-versatile"
    max_questions: int = 5
    min_questions: int = 3
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    hf_token: str | None = None


settings = Settings()
