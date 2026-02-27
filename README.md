# StudyLog

A fullstack app for studying from daily notes: write notes, get AI-generated quizzes, and take daily/weekly tests with smart repetition.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + TailwindCSS
- **Backend:** FastAPI (Python) + SQLAlchemy + SQLite
- **AI:** Ollama (local, default model: mistral)

## Quick start

1. **Install and run Ollama**
   - Install from [ollama.ai](https://ollama.ai)
   - Run: `ollama serve` (if not auto-started)
   - Pull model: `ollama pull mistral`

2. **Backend**
   ```bash
   cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
   ```
   See [backend/README.md](backend/README.md) for details.

3. **Frontend**
   ```bash
   cd frontend && npm install && npm run dev
   ```
   See [frontend/README.md](frontend/README.md) for details.

4. Open [http://localhost:3000](http://localhost:3000)

## Structure

- `frontend/` — Next.js app
- `backend/` — FastAPI app + SQLite

## Key features

- Daily study pages with autosave
- AI-generated daily quizzes and weekly tests
- Smart repetition weighting based on mistakes and streaks
- Test History with past quiz sessions
- Facts Notes page that shows all accumulated facts as continuous text
