"""
Core interview orchestration using LangChain LCEL chains.

Each chain is composed as: prompt | llm | StrOutputParser()
Streaming is exposed as SSE lines so routes stay thin.
"""

from collections.abc import Generator
from sqlalchemy.orm import Session
from langchain_core.output_parsers import StrOutputParser

from app.core.config import settings
from app.core.llm import get_llm_questions, get_llm_summary
from app.models.database import Answer, Interview, Question, Summary
from app.services import analysis_service, prompt_service


def _build_qas(interview: Interview) -> list[dict]:
    """Flatten questions and answers into a plain list for prompt formatting."""
    return [
        {
            "number": q.number,
            "question": q.text,
            "answer": q.answer.text if q.answer else None,
        }
        for q in interview.questions
    ]


def create_interview(
    db: Session,
    topic: str,
    num_questions: int,
    temperature: float = 0.7,
    persona: str = "neutral",
) -> Interview:
    """Creates a new interview record with the given settings."""
    clamped = max(settings.min_questions, min(settings.max_questions, num_questions))
    interview = Interview(
        topic=topic,
        num_questions=clamped,
        temperature=round(max(0.0, min(1.0, temperature)), 2),
        persona=persona if persona in ("neutral", "academic", "journalist", "coach") else "neutral",
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


def get_interview(db: Session, interview_id: str) -> Interview | None:
    return db.get(Interview, interview_id)


def list_interviews(db: Session) -> list[Interview]:
    from sqlalchemy import select, desc
    return list(db.scalars(select(Interview).order_by(desc(Interview.created_at))))


def submit_answer(db: Session, interview_id: str, question_id: str, text: str) -> Answer:
    """Runs sentiment and emotion analysis on the answer text, then saves it."""
    score, label, emotions = analysis_service.score_sentiment(text, settings.hf_token)
    answer = Answer(
        interview_id=interview_id,
        question_id=question_id,
        text=text,
        sentiment_score=score,
        sentiment_label=label,
        emotions=emotions or None,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


def stream_next_question(db: Session, interview_id: str) -> Generator[str, None, None]:
    """Generates and streams the next question as SSE tokens.
    If an unanswered question already exists, re-streams it instead of creating a new one."""
    db.expire_all()  # force fresh load from DB
    interview = db.get(Interview, interview_id)
    if interview is None:
        yield "data: [ERROR] Interview not found\n\n"
        return

    # Re-use any existing unanswered question (handles duplicate connections)
    unanswered = [q for q in interview.questions if q.answer is None]
    if unanswered:
        existing = unanswered[0]
        yield f"data: {existing.text}\n\n"
        yield f"data: [QUESTION_ID:{existing.id}]\n\n"
        yield "data: [DONE]\n\n"
        return

    next_number = len(interview.questions) + 1
    if next_number > interview.num_questions:
        yield "data: [DONE]\n\n"
        return

    temperature = interview.temperature if interview.temperature is not None else 0.7
    persona = interview.persona or "neutral"
    chain = prompt_service.get_question_prompt(persona) | get_llm_questions(temperature) | StrOutputParser()

    full_text = ""
    for chunk in chain.stream({
        "topic": interview.topic,
        "history": prompt_service.format_history(_build_qas(interview)),
    }):
        full_text += chunk
        yield f"data: {chunk.replace(chr(10), ' ')}\n\n"

    question = Question(
        interview_id=interview_id,
        number=next_number,
        text=full_text.strip(),
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    yield f"data: [QUESTION_ID:{question.id}]\n\n"
    yield "data: [DONE]\n\n"


def stream_summary(db: Session, interview_id: str) -> Generator[str, None, None]:
    """Streams the AI-generated summary as SSE tokens, then runs local NLP analysis and saves everything."""
    interview = db.get(Interview, interview_id)
    if interview is None:
        yield "data: [ERROR] Interview not found\n\n"
        return

    # Aggregate emotion profile before prompting so LLM can narrate it
    answer_emotions = [
        q.answer.emotions
        for q in interview.questions
        if q.answer and q.answer.emotions
    ]
    emotion_profile = analysis_service.aggregate_emotions(answer_emotions)

    chain = prompt_service.summary_prompt | get_llm_summary() | StrOutputParser()

    full_text = ""
    for chunk in chain.stream({
        "transcript": prompt_service.format_transcript(
            interview.topic, _build_qas(interview), emotion_profile or None
        ),
    }):
        full_text += chunk
        yield f"data: {chunk.replace(chr(10), ' ')}\n\n"

    answer_texts = [q.answer.text for q in interview.questions if q.answer]
    keywords = analysis_service.extract_keywords(answer_texts)
    themes = analysis_service.extract_themes(full_text)

    sentiment_scores = [
        q.answer.sentiment_score
        for q in interview.questions
        if q.answer and q.answer.sentiment_score is not None
    ]
    overall_score = round(sum(sentiment_scores) / len(sentiment_scores), 4) if sentiment_scores else None
    if overall_score is None:
        overall_label = "neutral"
    elif overall_score >= 0.05:
        overall_label = "positive"
    elif overall_score <= -0.05:
        overall_label = "negative"
    else:
        overall_label = "neutral"

    summary = Summary(
        interview_id=interview_id,
        text=full_text.strip(),
        themes=themes,
        keywords=keywords,
        overall_sentiment=overall_score,
        sentiment_label=overall_label,
    )
    db.add(summary)
    interview.status = "completed"
    db.commit()

    yield "data: [DONE]\n\n"
