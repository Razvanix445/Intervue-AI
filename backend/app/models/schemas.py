from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AnswerSentiment(BaseModel):
    score: float
    label: str  # positive | neutral | negative


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    number: int
    text: str
    created_at: datetime


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_id: str
    text: str
    sentiment_score: float | None
    sentiment_label: str | None
    emotions: list[dict] | None = None  # [{label, score, emoji}] sorted by confidence
    created_at: datetime


class QuestionWithAnswer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    number: int
    text: str
    answer: AnswerOut | None = None


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str
    themes: list[str] | None
    keywords: list[dict] | None  # [{"word": str, "score": float}]
    overall_sentiment: float | None
    sentiment_label: str | None
    created_at: datetime


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic: str
    status: str
    num_questions: int
    temperature: float | None = None
    persona: str | None = None
    created_at: datetime
    updated_at: datetime
    questions: list[QuestionWithAnswer] = []
    summary: SummaryOut | None = None


class InterviewListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    topic: str
    status: str
    num_questions: int
    overall_sentiment: float | None = None
    sentiment_label: str | None = None
    created_at: datetime


class CreateInterviewRequest(BaseModel):
    topic: str
    num_questions: int = 4
    temperature: float = 0.7   # 0.3 = focused/precise, 1.0 = creative/exploratory
    persona: str = "neutral"   # neutral | academic | journalist | coach


class SubmitAnswerRequest(BaseModel):
    question_id: str
    text: str
