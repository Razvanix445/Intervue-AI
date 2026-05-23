import pytest
from app.services.analysis_service import score_sentiment, extract_keywords


def test_score_sentiment_positive():
    score, label, emotions = score_sentiment("I absolutely love this topic, it's fascinating!")
    assert label == "positive"
    assert score > 0.05
    assert isinstance(emotions, list)


def test_score_sentiment_negative():
    score, label, emotions = score_sentiment("This is terrible, I hate it and it's completely wrong.")
    assert label == "negative"
    assert score < -0.05


def test_score_sentiment_neutral():
    score, label, emotions = score_sentiment("The meeting is on Tuesday.")
    assert label == "neutral"


def test_extract_keywords_returns_words():
    texts = [
        "Artificial intelligence is transforming the workplace significantly.",
        "Machine learning models are becoming more efficient in enterprise settings.",
        "AI tools help automate repetitive tasks in the workplace.",
    ]
    keywords = extract_keywords(texts, top_n=5)
    assert len(keywords) > 0
    assert all("word" in kw and "score" in kw for kw in keywords)
    assert all(isinstance(kw["score"], float) for kw in keywords)


def test_extract_keywords_empty_input():
    keywords = extract_keywords([])
    assert keywords == []


def test_extract_keywords_blank_strings():
    keywords = extract_keywords(["   ", ""])
    assert keywords == []
