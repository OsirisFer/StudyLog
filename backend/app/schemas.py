"""Pydantic schemas for API."""
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


# ----- DailyPage -----
class DailyPageBase(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    title: str | None = None
    content: str = ""


class DailyPageCreate(DailyPageBase):
    pass


class DailyPageUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class DailyPageResponse(BaseModel):
    id: int
    date: str
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ----- Question -----
class QuestionResponse(BaseModel):
    id: int
    daily_page_date: str
    question_text: str
    correct_answer: str
    distractor_1: str
    distractor_2: str
    distractor_3: str
    explanation: str | None
    wrong_count: int
    correct_streak: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionWithOptions(BaseModel):
    id: int
    question_text: str
    options: list[str]  # shuffled, same order for client
    correct_answer: str  # so client can check
    explanation: str | None
    wrong_count: int
    correct_streak: int


# ----- Attempt -----
class AttemptCreate(BaseModel):
    question_id: int
    selected_option: str
    was_correct: bool


class AttemptResponse(BaseModel):
    id: int
    question_id: int
    selected_option: str
    was_correct: bool
    answered_at: datetime

    class Config:
        from_attributes = True


# ----- Quiz -----
class QuizResultItem(BaseModel):
    question_id: int
    question_text: str
    selected_option: str
    correct_answer: str
    was_correct: bool
    explanation: str | None


class DailyQuizResponse(BaseModel):
    questions: list[QuestionWithOptions]
    date: str


class WeeklyQuizResponse(BaseModel):
    questions: list[QuestionWithOptions]
    start: str
    end: str


class QuizScoreResponse(BaseModel):
    total: int
    correct: int
    mistakes: list[QuizResultItem]


# ----- Test History -----
class TestMistakeCreate(BaseModel):
    question_id: int | None = None
    question_text: str
    selected_option: str
    correct_answer: str
    explanation: str | None = None


class TestRecordCreate(BaseModel):
    type: Literal["daily", "weekly"]
    date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    start: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    end: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    total_questions: int = Field(..., ge=1)
    correct_answers: int = Field(..., ge=0)
    mistakes: list[TestMistakeCreate] = []


class TestRecordResponse(BaseModel):
    id: int
    type: Literal["daily", "weekly"]
    date: str | None
    start: str | None
    end: str | None
    total_questions: int
    correct_answers: int
    score_percent: float
    completed_at: datetime

    class Config:
        from_attributes = True


class TestMistakeResponse(BaseModel):
    id: int
    question_id: int | None
    question_text: str
    selected_option: str
    correct_answer: str
    explanation: str | None

    class Config:
        from_attributes = True


class TestRecordDetailResponse(TestRecordResponse):
    mistakes: list[TestMistakeResponse]


# ----- Knowledge base -----
class KnowledgeItemResponse(BaseModel):
    id: int
    source_date: str
    question_text: str
    options: list[str]
    correct_option: str
    explanation: str | None
    tags: list[str]
    wrong_count: int
    correct_streak: int
    created_at: datetime
