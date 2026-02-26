import Link from 'next/link'
import { getTest } from '@/lib/api'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function TestDetailPage({ params }: Props) {
  const { id } = await params
  const testId = Number(id)
  if (!Number.isFinite(testId)) notFound()

  let test
  try {
    test = await getTest(testId)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/tests" className="text-[var(--muted)] hover:text-[var(--text)] text-sm">
          ← Test History
        </Link>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">
          {test.type === 'daily' ? 'Daily Quiz' : 'Weekly Test'}
        </h1>
        <p className="text-[var(--muted)] mb-4">
          {test.type === 'daily'
            ? (test.date ?? '')
            : `${test.start ?? '…'} – ${test.end ?? '…'}`}
        </p>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">Completed</p>
            <p className="text-[var(--text)]">{new Date(test.completed_at).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-[var(--accent)]">{test.score_percent.toFixed(2)}%</p>
            <p className="text-sm text-[var(--muted)]">{test.correct_answers} / {test.total_questions}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">Mistakes</h2>
        {test.mistakes.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-[var(--muted)]">No mistakes. Perfect score.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {test.mistakes.map((m) => (
              <li key={m.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
                <p className="font-medium text-[var(--text)]">{m.question_text}</p>
                <p className="text-sm text-[var(--wrong)] mt-2">You chose: {m.selected_option}</p>
                <p className="text-sm text-[var(--correct)]">Correct: {m.correct_answer}</p>
                {m.explanation && <p className="text-sm text-[var(--muted)] mt-2">{m.explanation}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
