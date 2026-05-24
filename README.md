# Intervue AI

An AI-powered interview tool that conducts structured conversations on any topic, analyses the responses in real time, and produces a written summary with sentiment and emotion data.

---

## What it does

The user picks a topic, either from a list of presets or by typing their own, and the AI asks a sequence of open-ended questions one at a time. Each answer is analysed for sentiment and emotion as it's submitted. Once all questions are answered, the app generates a narrative summary covering the main themes, standout points, and the emotional tone of the conversation.

All interview data is stored locally and can be revisited or exported as JSON at any time.

---

## Deployment

The app is available at: https://intervue-ai-1.vercel.app/

---

## Docker

Run the full stack locally with a single command.

Create an '.env' file in the project root:

```env
GROQ_API_KEY=groq_key
HF_TOKEN=hf_token
```

```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## Features

**Interview flow**
- Custom or preset topics
- 3 to 5 sequentially generated questions, each building on previous answers
- Voice dictation support via the Web Speech API

**LLM settings**
- Creativity slider — controls the temperature of the question model (focused to creative)
- Interviewer style — four personas that shape the tone of the questions: Neutral, Academic, Journalist, Coach

**Analysis (per answer)**
- Sentiment score and label (positive / neutral / negative)
- Emotion classification using the HuggingFace `j-hartmann/emotion-english-distilroberta-base` model (joy, sadness, fear, anger, disgust, surprise, neutral), with VADER as a fallback when no HF token is configured

**Summary**
- AI-generated narrative covering overall stance, key themes, and notable positions
- Keyword extraction via TF-IDF across all answers
- Aggregated emotion profile across the full interview
- Sentiment trajectory chart, emotion bar chart, and keyword cloud

**History**
- All interviews are saved and accessible from the left sidebar
- Each entry shows the topic, date, completion status, and overall sentiment
- Interviews can be exported to JSON

---

## Tech stack

| Layer | Technology                                                                               |
|---|------------------------------------------------------------------------------------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS                                        |
| Backend | FastAPI, Python 3.11+                                                                    |
| LLM | Groq API — `llama-3.1-8b-instant` for questions, `llama-3.3-70b-versatile` for summaries |
| Prompting | LangChain LCEL chains                                                                    |
| Sentiment | HuggingFace Inference API (primary), VADER + NRC Lexicon (fallback)                      |
| Keywords | scikit-learn TF-IDF                                                                      |
| Database | SQLAlchemy ORM with SQLite                                                                 |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com)
- Optionally, a [HuggingFace token](https://huggingface.co/settings/tokens) for the emotion model

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
GROQ_API_KEY=groq_key
HF_TOKEN=hf_token
```

Start the server:

```bash
uvicorn app.main:app --reload
```

The API runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI runs on `http://localhost:3000`.

---

## Project structure

```
backend/
  app/
    api/routes/        # FastAPI route handlers
    core/              # Config and LLM client factory
    db/                # SQLAlchemy engine and session
    models/            # ORM models and Pydantic schemas
    services/
      interview_service.py   # Orchestration and SSE streaming
      prompt_service.py      # LangChain prompt templates and persona logic
      analysis_service.py    # Sentiment, emotion, and keyword analysis

frontend/
  src/
    app/               # Next.js App Router pages
    components/        # Sidebar, charts, layout
    lib/               # API client and TypeScript types
```

---
