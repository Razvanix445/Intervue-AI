"""
Emotion-based sentiment analysis.

Primary:  HuggingFace Inference API — j-hartmann/emotion-english-distilroberta-base
          Returns 7 emotions (anger, disgust, fear, joy, neutral, sadness, surprise).
          Sentiment score is derived via weighted polarity aggregation.

Fallback: VADER (rule-based) — used when HF_TOKEN is not set or the API is unavailable.
"""

import httpx
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()

HF_MODEL_URL = (
    "https://api-inference.huggingface.co/models/"
    "j-hartmann/emotion-english-distilroberta-base"
)

# Polarity weight per emotion: positive emotions > 0, negative < 0
EMOTION_WEIGHTS: dict[str, float] = {
    "joy":      1.00,
    "surprise": 0.20,
    "neutral":  0.00,
    "sadness": -0.60,
    "fear":    -0.65,
    "disgust": -0.85,
    "anger":   -1.00,
}

EMOTION_EMOJI: dict[str, str] = {
    "joy":      "😊",
    "surprise": "😮",
    "neutral":  "😐",
    "sadness":  "😢",
    "fear":     "😰",
    "disgust":  "🤢",
    "anger":    "😠",
}


def _weighted_sentiment(emotions: list[dict]) -> tuple[float, str]:
    """Combines emotion confidence scores into a single [-1, +1] sentiment value."""
    raw = sum(e["score"] * EMOTION_WEIGHTS.get(e["label"], 0.0) for e in emotions)
    score = round(max(-1.0, min(1.0, raw)), 4)
    label = "positive" if score >= 0.15 else "negative" if score <= -0.15 else "neutral"
    return score, label


def _nrclex_emotions(text: str) -> list[dict]:
    """Local emotion detection via NRC Emotion Lexicon — no API key required."""
    try:
        from nrclex import NRCLex
        nrc = NRCLex(text)
        raw: dict[str, int] = nrc.raw_emotion_scores
        # Map NRC labels to our canonical set (skip anticipation / trust)
        mapping = {
            "joy": "joy", "fear": "fear", "anger": "anger",
            "sadness": "sadness", "disgust": "disgust", "surprise": "surprise",
        }
        relevant = {mapping[k]: v for k, v in raw.items() if k in mapping and v > 0}
        total = sum(relevant.values())
        if total == 0:
            return [{"label": "neutral", "score": 1.0, "emoji": EMOTION_EMOJI["neutral"]}]
        emotions = [
            {"label": label, "score": round(cnt / total, 4), "emoji": EMOTION_EMOJI.get(label, "")}
            for label, cnt in relevant.items()
        ]
        return sorted(emotions, key=lambda x: x["score"], reverse=True)
    except Exception:
        return []


def _vader_fallback(text: str) -> tuple[float, str, list[dict]]:
    compound = round(_vader.polarity_scores(text)["compound"], 4)
    label = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"
    emotions = _nrclex_emotions(text)
    return compound, label, emotions


def aggregate_emotions(all_emotions: list[list[dict]]) -> list[dict]:
    """Average emotion scores across all interview answers."""
    non_empty = [e for e in all_emotions if e]
    if not non_empty:
        return []
    n = len(non_empty)
    totals: dict[str, float] = {}
    emojis: dict[str, str] = {}
    for emotions in non_empty:
        for e in emotions:
            label = e["label"]
            totals[label] = totals.get(label, 0.0) + e["score"]
            if e.get("emoji"):
                emojis[label] = e["emoji"]
    result = [
        {"label": label, "score": round(total / n, 4), "emoji": emojis.get(label, "")}
        for label, total in totals.items()
        if round(total / n, 4) > 0.01
    ]
    return sorted(result, key=lambda x: x["score"], reverse=True)


def score_sentiment(text: str, hf_token: str | None = None) -> tuple[float, str, list[dict]]:
    """Scores text via the HuggingFace emotion model, falling back to VADER if unavailable.
    Returns a (score, label, emotions) tuple."""
    if not text.strip() or not hf_token:
        return _vader_fallback(text)

    try:
        resp = httpx.post(
            HF_MODEL_URL,
            headers={"Authorization": f"Bearer {hf_token}"},
            json={"inputs": text, "options": {"wait_for_model": True}},
            timeout=25.0,
        )
        resp.raise_for_status()
        raw_emotions: list[dict] = resp.json()[0]

        score, label = _weighted_sentiment(raw_emotions)
        emotions = [
            {**e, "emoji": EMOTION_EMOJI.get(e["label"], "")}
            for e in sorted(raw_emotions, key=lambda x: x["score"], reverse=True)
        ]
        return score, label, emotions

    except Exception:
        # Never break the interview flow — degrade gracefully to VADER
        return _vader_fallback(text)


def extract_keywords(texts: list[str], top_n: int = 10) -> list[dict]:
    """TF-IDF keyword extraction over a list of answer texts."""
    if not texts or all(not t.strip() for t in texts):
        return []

    from sklearn.feature_extraction.text import TfidfVectorizer
    import numpy as np

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=200,
            ngram_range=(1, 2),
            min_df=1,
        )
        matrix = vectorizer.fit_transform(texts)
        names = vectorizer.get_feature_names_out()
        scores = np.asarray(matrix.mean(axis=0)).flatten()
        top = scores.argsort()[::-1][:top_n]
        return [
            {"word": names[i], "score": round(float(scores[i]), 4)}
            for i in top if scores[i] > 0
        ]
    except ValueError:
        return []


def extract_themes(summary_text: str) -> list[str]:
    """Extract explicitly named themes from the LLM summary text."""
    import re
    quoted = re.findall(r'"([^"]{4,40})"', summary_text)
    title_cased = re.findall(r'\b(?:[A-Z][a-z]+ ){1,3}[A-Z][a-z]+\b', summary_text)
    seen: set[str] = set()
    themes = []
    for phrase in quoted + title_cased:
        key = phrase.strip().lower()
        if key not in seen:
            seen.add(key)
            themes.append(phrase.strip())
    return themes[:6]
