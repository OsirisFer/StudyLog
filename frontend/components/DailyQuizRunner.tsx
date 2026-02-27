'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MathText } from '@/components/MathText'
import { createTestRecord, getDailyQuiz, submitAttempt, type QuestionWithOptions } from '@/lib/api'

type Props = { date: string; n: number }

type Answered = {
  questionId: number
  questionText: string
  selectedOption: string
  wasCorrect: boolean
  correctAnswer: string
  explanation: string | null
}

export function DailyQuizRunner({ date, n }: Props) {
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [history, setHistory] = useState<Answered[]>([])
  const [testRecordId, setTestRecordId] = useState<number | null>(null)
  const [testRecordError, setTestRecordError] = useState<string | null>(null)
  const postedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    getDailyQuiz(date, n)
      .then((data) => {
        if (!cancelled) setQuestions(data.questions)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load quiz')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [date, n])

  const current = questions[index]
  const progress = questions.length ? ((index + (answered ? 1 : 0)) / questions.length) * 100 : 0

  useEffect(() => {
    if (postedRef.current) return
    if (!questions.length) return
    if (index < questions.length) return

    postedRef.current = true
    const correct = history.filter((a) => a.wasCorrect).length
    const mistakes = history
      .filter((a) => !a.wasCorrect)
      .map((a) => ({
        question_id: a.questionId,
        question_text: a.questionText,
        selected_option: a.selectedOption,
        correct_answer: a.correctAnswer,
        explanation: a.explanation,
      }))

    createTestRecord({
      type: 'daily',
      date,
      total_questions: questions.length,
      correct_answers: correct,
      mistakes,
    })
      .then((r) => setTestRecordId(r.id))
      .catch((e) => setTestRecordError(e instanceof Error ? e.message : 'Failed to save test record'))
  }, [date, history, index, questions.length])

  const handleSelect = async (option: string) => {
    if (!current || answered) return
    const wasCorrect = option === current.correct_answer
    setAnswered({
      questionId: current.id,
      questionText: current.question_text,
      selectedOption: option,
      wasCorrect,
      correctAnswer: current.correct_answer,
      explanation: current.explanation ?? null,
    })
    setHistory((h) => [
      ...h,
      {
        questionId: current.id,
        questionText: current.question_text,
        selectedOption: option,
        wasCorrect,
        correctAnswer: current.correct_answer,
        explanation: current.explanation ?? null,
      },
    ])
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

  if (loading) {
    return <p className="text-[var(--muted)]">Loading quiz…</p>
  }
  if (error) {
    return (
      <div>
        <p className="text-[var(--wrong)] mb-4">{error}</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">Back to Dashboard</Link>
      </div>
    )
  }
  if (questions.length === 0) {
    return (
      <div>
        <p className="text-[var(--muted)] mb-4">No questions for this day. Generate a quiz from the daily page first.</p>
        <Link href={`/daily/${date}`} className="text-[var(--accent)] hover:underline">Go to {date}</Link>
      </div>
    )
  }

  if (index >= questions.length) {
    const correct = history.filter((a) => a.wasCorrect).length
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold mb-2">Quiz complete</h2>
          <p className="text-[var(--muted)]">
            Score: {correct} / {questions.length}
          </p>
          {testRecordId && (
            <p className="text-sm text-[var(--muted)] mt-2">
              Saved to <Link href={`/tests/${testRecordId}`} className="text-[var(--accent)] hover:underline">Test History</Link>.
            </p>
          )}
          {testRecordError && (
            <p className="text-sm text-[var(--wrong)] mt-2">{testRecordError}</p>
          )}
        </div>
        <Link href="/" className="inline-block text-[var(--accent)] hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-[var(--muted)] shrink-0">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="font-medium text-[var(--text)] mb-4"><MathText content={current.question_text} /></div>
        <ul className="space-y-2">
          {current.options.map((opt) => {
            const isSelected = answered?.selectedOption === opt
            const isCorrect = opt === current.correct_answer
            const showResult = answered !== null
            let style = 'border-[var(--border)] hover:bg-[var(--border)]/30'
            if (showResult) {
              if (isCorrect) style = 'border-[var(--correct)] bg-[var(--correct)]/10'
              else if (isSelected && !answered.wasCorrect) style = 'border-[var(--wrong)] bg-[var(--wrong)]/10'
            }
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  disabled={!!answered}
                  className={`w-full text-left rounded-md border px-4 py-3 transition-colors disabled:cursor-default ${style}`}
                >
                  <MathText content={opt} />
                </button>
              </li>
            )
          })}
        </ul>
        {answered && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className={`text-sm font-medium ${answered.wasCorrect ? 'text-[var(--correct)]' : 'text-[var(--wrong)]'}`}>
              {answered.wasCorrect ? 'Correct.' : <><span className="mr-1">Correct answer:</span> <MathText content={answered.correctAnswer} /></>}
            </div>
            {answered.explanation && (
              <div className="text-sm text-[var(--muted)] mt-2"><MathText content={answered.explanation} /></div>
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
