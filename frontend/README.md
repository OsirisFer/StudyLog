# StudyLog Frontend

Next.js (App Router) + TypeScript + TailwindCSS.

## Prerequisites

- Node.js 18+
- Backend running at `http://localhost:8000` (or set `NEXT_PUBLIC_API_URL`)

## Setup

```bash
cd frontend
npm install
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` — Dashboard (list of days, calendar)
- `/daily/[date]` — Daily note editor (autosave, generate quiz, start quiz)
- `/quiz/daily` — Daily quiz (optional `?date=YYYY-MM-DD&n=10`)
- `/quiz/weekly` — Weekly test (current week, 20 questions)
- `/tests` — Test History (past quiz sessions)
- `/knowledge` — Knowledge Base (all accumulated questions)

## Build

```bash
npm run build
npm start
```
