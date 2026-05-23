from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.schemas import (
    CreateInterviewRequest,
    InterviewListItem,
    InterviewOut,
    SubmitAnswerRequest,
    AnswerOut,
)
from app.services import interview_service

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("", response_model=InterviewOut, status_code=201)
def create_interview(body: CreateInterviewRequest, db: Session = Depends(get_db)):
    interview = interview_service.create_interview(
        db, body.topic, body.num_questions, body.temperature, body.persona
    )
    return interview


@router.get("", response_model=list[InterviewListItem])
def list_interviews(db: Session = Depends(get_db)):
    interviews = interview_service.list_interviews(db)
    result = []
    for iv in interviews:
        item = InterviewListItem.model_validate(iv)
        if iv.summary:
            item.overall_sentiment = iv.summary.overall_sentiment
            item.sentiment_label = iv.summary.sentiment_label
        result.append(item)
    return result


@router.get("/{interview_id}", response_model=InterviewOut)
def get_interview(interview_id: str, db: Session = Depends(get_db)):
    interview = interview_service.get_interview(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.get("/{interview_id}/stream-question")
def stream_question(interview_id: str, db: Session = Depends(get_db)):
    interview = interview_service.get_interview(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return StreamingResponse(
        interview_service.stream_next_question(db, interview_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{interview_id}/answers", response_model=AnswerOut, status_code=201)
def submit_answer(
    interview_id: str, body: SubmitAnswerRequest, db: Session = Depends(get_db)
):
    interview = interview_service.get_interview(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    answer = interview_service.submit_answer(
        db, interview_id, body.question_id, body.text
    )
    return answer


@router.get("/{interview_id}/stream-summary")
def stream_summary(interview_id: str, db: Session = Depends(get_db)):
    interview = interview_service.get_interview(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return StreamingResponse(
        interview_service.stream_summary(db, interview_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{interview_id}/export")
def export_interview(interview_id: str, db: Session = Depends(get_db)):
    interview = interview_service.get_interview(db, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    data = InterviewOut.model_validate(interview).model_dump(mode="json")
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="interview-{interview_id[:8]}.json"'
        },
    )
