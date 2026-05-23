from langchain_groq import ChatGroq
from app.core.config import settings


def get_llm_questions(temperature: float = 0.7) -> ChatGroq:
    return ChatGroq(
        model=settings.model_questions,
        api_key=settings.groq_api_key,
        max_tokens=256,
        temperature=max(0.0, min(1.0, temperature)),
        streaming=True,
    )


def get_llm_summary() -> ChatGroq:
    return ChatGroq(
        model=settings.model_summary,
        api_key=settings.groq_api_key,
        max_tokens=512,
        temperature=0.4,
        streaming=True,
    )
