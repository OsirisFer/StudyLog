# StudyLog Backend

FastAPI + SQLAlchemy + SQLite + Ollama (LLM).

## Prerequisites

- Python 3.10+
- Ollama installed and running (`ollama serve`), with model: `ollama pull mistral`

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

## Endpoints

- `GET/POST /daily-pages` — list, create
- `GET/PUT /daily-pages/{date}` — get, update
- `POST /daily-pages/{date}/generate-quiz` — generate questions from that day's content
- `GET /quiz/daily?date=YYYY-MM-DD&n=10` — get daily quiz (weighted)
- `GET /quiz/weekly?start=...&end=...&n=20` — get weekly quiz
- `POST /attempts` — record an attempt (updates question wrong_count / correct_streak)

Database file: `./studylog.db` (created on first run).
