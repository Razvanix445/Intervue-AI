import pytest
from unittest.mock import MagicMock, patch


def test_create_interview(client):
    resp = client.post("/api/interviews", json={"topic": "AI in healthcare", "num_questions": 3})
    assert resp.status_code == 201
    data = resp.json()
    assert data["topic"] == "AI in healthcare"
    assert data["num_questions"] == 3
    assert data["status"] == "active"
    assert "id" in data


def test_get_interview(client):
    create = client.post("/api/interviews", json={"topic": "Remote work", "num_questions": 4})
    interview_id = create.json()["id"]

    resp = client.get(f"/api/interviews/{interview_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == interview_id


def test_get_interview_not_found(client):
    resp = client.get("/api/interviews/nonexistent-id")
    assert resp.status_code == 404


def test_list_interviews(client):
    client.post("/api/interviews", json={"topic": "Climate tech", "num_questions": 3})
    resp = client.get("/api/interviews")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


def test_submit_answer(client):
    create = client.post("/api/interviews", json={"topic": "Productivity", "num_questions": 3})
    interview_id = create.json()["id"]

    # Manually add a question via the service layer
    from app.services.interview_service import create_interview
    from app.models.database import Question

    with patch("app.api.routes.interviews.interview_service.stream_next_question"):
        pass

    # Insert a question directly in DB through the test session
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    q = Question(interview_id=interview_id, number=1, text="What do you think about productivity tools?")
    db.add(q)
    db.commit()
    db.refresh(q)
    question_id = q.id
    db.close()

    resp = client.post(
        f"/api/interviews/{interview_id}/answers",
        json={"question_id": question_id, "text": "I find them very helpful for staying organised."},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["text"] == "I find them very helpful for staying organised."
    assert data["sentiment_label"] in ("positive", "neutral", "negative")
    assert data["sentiment_score"] is not None


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_export_interview(client):
    create = client.post("/api/interviews", json={"topic": "Export test", "num_questions": 3})
    interview_id = create.json()["id"]

    resp = client.get(f"/api/interviews/{interview_id}/export")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    assert "id" in resp.json()
