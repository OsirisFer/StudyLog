"""SQLAlchemy models for StudyLog."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship

from .database import Base


class DailyPage(Base):
    __tablename__ = "daily_pages"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), unique=True, index=True, nullable=False)  # YYYY-MM-DD
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship("Question", back_populates="daily_page", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    daily_page_date = Column(String(10), ForeignKey("daily_pages.date", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    distractor_1 = Column(Text, nullable=False)
    distractor_2 = Column(Text, nullable=False)
    distractor_3 = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    wrong_count = Column(Integer, default=0)
    correct_streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    daily_page = relationship("DailyPage", back_populates="questions")
    attempts = relationship("Attempt", back_populates="question", cascade="all, delete-orphan")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option = Column(Text, nullable=False)
    was_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow)

    question = relationship("Question", back_populates="attempts")


class TestRecord(Base):
    __tablename__ = "test_records"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(10), nullable=False)  # daily|weekly
    date = Column(String(10), nullable=True)  # YYYY-MM-DD (daily)
    start = Column(String(10), nullable=True)  # YYYY-MM-DD (weekly)
    end = Column(String(10), nullable=True)  # YYYY-MM-DD (weekly)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    score_percent = Column(Float, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, index=True)

    mistakes = relationship("TestMistake", back_populates="test_record", cascade="all, delete-orphan")


class TestMistake(Base):
    __tablename__ = "test_mistakes"

    id = Column(Integer, primary_key=True, index=True)
    test_record_id = Column(Integer, ForeignKey("test_records.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    question_text = Column(Text, nullable=False)
    selected_option = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)

    test_record = relationship("TestRecord", back_populates="mistakes")
