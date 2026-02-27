"""FastAPI application: CORS, routes, DB init."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import random
from sqlalchemy import or_

from .database import get_db, init_db
from .models import DailyPage, Question, Attempt, TestRecord, TestMistake
from .schemas import (
    DailyPageCreate,
    DailyPageUpdate,
    DailyPageResponse,
    QuestionResponse,
    QuestionWithOptions,
    AttemptCreate,
    AttemptResponse,
    DailyQuizResponse,
    WeeklyQuizResponse,
    QuizResultItem,
    TestRecordCreate,
    TestRecordResponse,
    TestRecordDetailResponse,
    TestMistakeResponse,
    KnowledgeItemResponse,
)
from .llm import generate_quiz_facts
from .weighted import weighted_sample


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="StudyLog API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def page_to_response(p: DailyPage) -> DailyPageResponse:
    return DailyPageResponse(
        id=p.id,
        date=p.date,
        title=p.title,
        content=p.content or "",
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def question_to_with_options(q: Question, shuffle: bool = True) -> QuestionWithOptions:
    options = [q.correct_answer, q.distractor_1, q.distractor_2, q.distractor_3]
    if shuffle:
        random.shuffle(options)
    return QuestionWithOptions(
        id=q.id,
        question_text=q.question_text,
        options=options,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        wrong_count=q.wrong_count,
        correct_streak=q.correct_streak,
    )


# ----- Daily pages -----
@app.get("/daily-pages", response_model=list[DailyPageResponse])
def list_daily_pages(db: Session = Depends(get_db)):
    pages = db.query(DailyPage).order_by(DailyPage.date.desc()).all()
    return [page_to_response(p) for p in pages]


@app.post("/daily-pages", response_model=DailyPageResponse)
def create_daily_page(body: DailyPageCreate, db: Session = Depends(get_db)):
    existing = db.query(DailyPage).filter(DailyPage.date == body.date).first()
    if existing:
        raise HTTPException(status_code=400, detail="Page for this date already exists")
    page = DailyPage(date=body.date, title=body.title, content=body.content or "")
    db.add(page)
    db.commit()
    db.refresh(page)
    return page_to_response(page)


@app.get("/daily-pages/{date}", response_model=DailyPageResponse)
def get_daily_page(date: str, db: Session = Depends(get_db)):
    page = db.query(DailyPage).filter(DailyPage.date == date).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page_to_response(page)


@app.put("/daily-pages/{date}", response_model=DailyPageResponse)
def update_daily_page(date: str, body: DailyPageUpdate, db: Session = Depends(get_db)):
    page = db.query(DailyPage).filter(DailyPage.date == date).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    if body.title is not None:
        page.title = body.title
    if body.content is not None:
        page.content = body.content
    db.commit()
    db.refresh(page)
    return page_to_response(page)


@app.delete("/daily-pages/{date}")
def delete_daily_page(date: str, db: Session = Depends(get_db)):
    page = db.query(DailyPage).filter(DailyPage.date == date).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    db.delete(page)
    db.commit()
    return {"status": "deleted", "date": date}


@app.post("/daily-pages/{date}/generate-quiz", response_model=list[QuestionResponse])
def generate_quiz(date: str, db: Session = Depends(get_db)):
    page = db.query(DailyPage).filter(DailyPage.date == date).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    content = (page.content or "").strip()
    if len(content) < 20:
        raise HTTPException(status_code=400, detail="Not enough content to generate quiz (min 20 chars)")
    facts = generate_quiz_facts(content)
    created = []
    for f in facts:
        q = Question(
            daily_page_date=date,
            question_text=f["question"],
            correct_answer=f["correct_answer"],
            distractor_1=f["distractors"][0],
            distractor_2=f["distractors"][1],
            distractor_3=f["distractors"][2],
            explanation=f.get("explanation"),
        )
        db.add(q)
        created.append(q)
    db.commit()
    for q in created:
        db.refresh(q)
    return [
        QuestionResponse(
            id=q.id,
            daily_page_date=q.daily_page_date,
            question_text=q.question_text,
            correct_answer=q.correct_answer,
            distractor_1=q.distractor_1,
            distractor_2=q.distractor_2,
            distractor_3=q.distractor_3,
            explanation=q.explanation,
            wrong_count=q.wrong_count,
            correct_streak=q.correct_streak,
            created_at=q.created_at,
        )
        for q in created
    ]


# ----- Quiz -----
@app.get("/quiz/daily", response_model=DailyQuizResponse)
def get_daily_quiz(
    date: str = Query(..., description="YYYY-MM-DD"),
    n: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    questions = db.query(Question).filter(Question.daily_page_date == date).all()
    selected = weighted_sample(questions, n)
    return DailyQuizResponse(
        date=date,
        questions=[question_to_with_options(q) for q in selected],
    )


@app.get("/quiz/weekly", response_model=WeeklyQuizResponse)
def get_weekly_quiz(
    start: str = Query(..., description="YYYY-MM-DD (Monday)"),
    end: str = Query(..., description="YYYY-MM-DD (Sunday)"),
    n: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    questions = (
        db.query(Question)
        .filter(Question.daily_page_date >= start, Question.daily_page_date <= end)
        .all()
    )
    selected = weighted_sample(questions, n)
    return WeeklyQuizResponse(
        start=start,
        end=end,
        questions=[question_to_with_options(q) for q in selected],
    )


# ----- Attempts -----
@app.post("/attempts", response_model=AttemptResponse)
def create_attempt(body: AttemptCreate, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == body.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    attempt = Attempt(
        question_id=body.question_id,
        selected_option=body.selected_option,
        was_correct=body.was_correct,
    )
    db.add(attempt)
    if body.was_correct:
        question.correct_streak += 1
    else:
        question.wrong_count += 1
        question.correct_streak = 0
    db.commit()
    db.refresh(attempt)
    return AttemptResponse(
        id=attempt.id,
        question_id=attempt.question_id,
        selected_option=attempt.selected_option,
        was_correct=attempt.was_correct,
        answered_at=attempt.answered_at,
    )


@app.get("/health")
def health():
    return {"status": "ok"}


# ----- Test History -----
@app.post("/tests", response_model=TestRecordResponse)
def create_test_record(body: TestRecordCreate, db: Session = Depends(get_db)):
    if body.correct_answers > body.total_questions:
        raise HTTPException(status_code=400, detail="correct_answers cannot exceed total_questions")

    if body.type == "daily":
        if not body.date:
            raise HTTPException(status_code=400, detail="date is required for daily tests")
        if body.start or body.end:
            raise HTTPException(status_code=400, detail="start/end are only for weekly tests")
    else:
        if not body.start or not body.end:
            raise HTTPException(status_code=400, detail="start and end are required for weekly tests")
        if body.date:
            raise HTTPException(status_code=400, detail="date is only for daily tests")

    score_percent = round((body.correct_answers / body.total_questions) * 100.0, 2)

    record = TestRecord(
        type=body.type,
        date=body.date,
        start=body.start,
        end=body.end,
        total_questions=body.total_questions,
        correct_answers=body.correct_answers,
        score_percent=score_percent,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    for m in body.mistakes:
        mistake = TestMistake(
            test_record_id=record.id,
            question_id=m.question_id,
            question_text=m.question_text,
            selected_option=m.selected_option,
            correct_answer=m.correct_answer,
            explanation=m.explanation,
        )
        db.add(mistake)
    db.commit()
    db.refresh(record)

    return TestRecordResponse(
        id=record.id,
        type=record.type,  # type: ignore[arg-type]
        date=record.date,
        start=record.start,
        end=record.end,
        total_questions=record.total_questions,
        correct_answers=record.correct_answers,
        score_percent=record.score_percent,
        completed_at=record.completed_at,
    )


@app.get("/tests", response_model=list[TestRecordResponse])
def list_tests(db: Session = Depends(get_db)):
    rows = db.query(TestRecord).order_by(TestRecord.completed_at.desc()).all()
    return [
        TestRecordResponse(
            id=r.id,
            type=r.type,  # type: ignore[arg-type]
            date=r.date,
            start=r.start,
            end=r.end,
            total_questions=r.total_questions,
            correct_answers=r.correct_answers,
            score_percent=r.score_percent,
            completed_at=r.completed_at,
        )
        for r in rows
    ]


@app.get("/tests/{test_id}", response_model=TestRecordDetailResponse)
def get_test(test_id: int, db: Session = Depends(get_db)):
    record = db.query(TestRecord).filter(TestRecord.id == test_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Test record not found")
    mistakes = db.query(TestMistake).filter(TestMistake.test_record_id == record.id).order_by(TestMistake.id.asc()).all()
    return TestRecordDetailResponse(
        id=record.id,
        type=record.type,  # type: ignore[arg-type]
        date=record.date,
        start=record.start,
        end=record.end,
        total_questions=record.total_questions,
        correct_answers=record.correct_answers,
        score_percent=record.score_percent,
        completed_at=record.completed_at,
        mistakes=[
            TestMistakeResponse(
                id=m.id,
                question_id=m.question_id,
                question_text=m.question_text,
                selected_option=m.selected_option,
                correct_answer=m.correct_answer,
                explanation=m.explanation,
            )
            for m in mistakes
        ],
    )


@app.delete("/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db)):
    record = db.query(TestRecord).filter(TestRecord.id == test_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Test record not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted", "id": test_id}


# ----- Facts / knowledge base -----
@app.get("/facts", response_model=list[KnowledgeItemResponse])
def get_knowledge(
    q: str | None = Query(None, description="Full-text search over question and answer"),
    tag: str | None = Query(None, description="Tag filter (reserved, currently unused)"),
    from_: str | None = Query(None, alias="from", description="YYYY-MM-DD, source_date >= from"),
    to: str | None = Query(None, description="YYYY-MM-DD, source_date <= to"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Question)

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            or_(
                Question.question_text.ilike(pattern),
                Question.correct_answer.ilike(pattern),
                Question.explanation.ilike(pattern),
            )
        )

    if from_:
        query = query.filter(Question.daily_page_date >= from_)
    if to:
        query = query.filter(Question.daily_page_date <= to)

    # Tag filter reserved for future use; tags are currently always empty.
    # if tag:
    #     ...

    rows = (
        query.order_by(Question.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: list[KnowledgeItemResponse] = []
    for q_row in rows:
        options = [
            q_row.correct_answer,
            q_row.distractor_1,
            q_row.distractor_2,
            q_row.distractor_3,
        ]
        items.append(
            KnowledgeItemResponse(
                id=q_row.id,
                source_date=q_row.daily_page_date,
                question_text=q_row.question_text,
                options=options,
                correct_option=q_row.correct_answer,
                explanation=q_row.explanation,
                tags=[],
                wrong_count=q_row.wrong_count,
                correct_streak=q_row.correct_streak,
                created_at=q_row.created_at,
            )
        )
    return items


@app.delete("/facts/{question_id}")
def delete_fact_item(question_id: int, db: Session = Depends(get_db)):
    row = db.query(Question).filter(Question.id == question_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Fact not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted", "id": question_id}
