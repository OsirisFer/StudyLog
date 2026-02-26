'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createTestRecord, getWeeklyQuiz, submitAttempt, type QuestionWithOptions } from '@/lib/api'

function getWeekRange(): { start: string; end: string } {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

type Answered = {
  questionId: number
  questionText: string
  selectedOption: string
  correctAnswer: string
  wasCorrect: boolean
  explanation: string | null
}

export default function WeeklyQuizPage() {
  const [range] = useState(() => getWeekRange())
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [history, setHistory] = useState<Answered[]>([])
  const [testRecordId, setTestRecordId] = useState<number | null>(null)
  const [testRecordError, setTestRecordError] = useState<string | null>(null)
  const postedRef = useRef(false)
  const n = 20

  useEffect(() => {
    let cancelled = false
    getWeeklyQuiz(range.start, range.end, n)
      .then((data) => {
        if (!cancelled) setQuestions(data.questions)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load quiz')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
  }, [range.start, range.end])

  const current = questions[index]
  const progress = questions.length ? ((index + (answered ? 1 : 0)) / questions.length) * 100 : 0

  const handleSelect = async (option: string) => {
    if (!current || answered) return
    const wasCorrect = option === current.correct_answer
    const item: Answered = {
      questionId: current.id,
      questionText: current.question_text,
      selectedOption: option,
      correctAnswer: current.correct_answer,
      wasCorrect,
      explanation: current.explanation ?? null,
    }
    setAnswered(item)
    setHistory((h) => [...h, item])
    try {
      await submitAttempt(current.id, option, wasCorrect)
    } catch {
      // ignore
    }
  }

  const next = () => {
    setAnswered(null)
    setIndex((i) => i + 1)
  }

  const mistakes = useMemo(() => history.filter((a) => !a.wasCorrect), [history])

  useEffect(() => {
    if (postedRef.current) return
    if (!questions.length) return
    if (index < questions.length) return

    postedRef.current = true
    const correct = history.filter((a) => a.wasCorrect).length
    createTestRecord({
      type: 'weekly',
      start: range.start,
      end: range.end,
      total_questions: questions.length,
      correct_answers: correct,
      mistakes: mistakes.map((m) => ({
        question_id: m.questionId,
        question_text: m.questionText,
        selected_option: m.selectedOption,
        correct_answer: m.correctAnswer,
        explanation: m.explanation,
      })),
    })
      .then((r) => setTestRecordId(r.id))
      .catch((e) => setTestRecordError(e instanceof Error ? e.message : 'Failed to save test record'))
  }, [history, index, mistakes, questions.length, range.end, range.start])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">Weekly Test</h1>
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">Weekly Test</h1>
        <p className="text-[var(--wrong)] mb-4">{error}</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">Back to Dashboard</Link>
      </div>
    )
  }
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">Weekly Test</h1>
        <p className="text-[var(--muted)] mb-4">No questions for this week. Add daily notes and generate quizzes first.</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  if (index >= questions.length) {
    const correct = history.filter((a) => a.wasCorrect).length
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Weekly Test — Results</h1>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold mb-2">Final score</h2>
          <p className="text-2xl text-[var(--accent)]">{correct} / {questions.length}</p>
          <p className="text-sm text-[var(--muted)] mt-1">{range.start} – {range.end}</p>
          {testRecordId && (
            <p className="text-sm text-[var(--muted)] mt-3">
              Saved to <Link href={`/tests/${testRecordId}`} className="text-[var(--accent)] hover:underline">Test History</Link>.
            </p>
          )}
          {testRecordError && (
            <p className="text-sm text-[var(--wrong)] mt-3">{testRecordError}</p>
          )}
        </div>
        {mistakes.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-semibold mb-3">Mistakes</h2>
            <ul className="space-y-4">
              {mistakes.map((m, i) => (
                <li key={i} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-[var(--text)]">{m.questionText}</p>
                  <p className="text-sm text-[var(--wrong)] mt-1">You chose: {m.selectedOption}</p>
                  <p className="text-sm text-[var(--correct)]">Correct: {m.correctAnswer}</p>
                  {m.explanation && <p className="text-sm text-[var(--muted)] mt-2">{m.explanation}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/" className="inline-block text-[var(--accent)] hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">Weekly Test</h1>
      <p className="text-[var(--muted)] mb-6">{range.start} – {range.end} (weighted)</p>

      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-[var(--muted)] shrink-0">{index + 1} / {questions.length}</span>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="font-medium text-[var(--text)] mb-4">{current.question_text}</p>
        <ul className="space-y-2">
          {current.options.map((opt) => {
            const isCorrect = opt === current.correct_answer
            const showResult = answered !== null
            const isSelected = answered?.selectedOption === opt
            let style = 'border-[var(--border)] hover:bg-[var(--border)]/30'
            if (showResult) {
              if (isCorrect) style = 'border-[var(--correct)] bg-[var(--correct)]/10'
              else if (isSelected) style = 'border-[var(--wrong)] bg-[var(--wrong)]/10'
            }
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  disabled={!!answered}
                  className={`w-full text-left rounded-md border px-4 py-3 transition-colors disabled:cursor-default ${style}`}
                >
                  {opt}
                </button>
              </li>
            )
          })}
        </ul>
        {answered && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className={`text-sm font-medium ${answered.wasCorrect ? 'text-[var(--correct)]' : 'text-[var(--wrong)]'}`}>
              {answered.wasCorrect ? 'Correct.' : `Correct: ${answered.correctAnswer}`}
            </p>
            {answered.explanation && (
              <p className="text-sm text-[var(--muted)] mt-2">{answered.explanation}</p>
            )}
            <button
              type="button"
              onClick={next}
              className="mt-4 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
