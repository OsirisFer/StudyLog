import Link from 'next/link'
import { listTests } from '@/lib/api'

export const dynamic = 'force-dynamic'

function labelFor(t: { type: 'daily' | 'weekly'; date: string | null; start: string | null; end: string | null }) {
  if (t.type === 'daily') return t.date || 'Daily'
  return `${t.start ?? '…'} – ${t.end ?? '…'}`
}

export default async function TestHistoryPage() {
  const tests = await listTests()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">Test History</h1>
      <p className="text-[var(--muted)] mb-6">Completed daily/weekly quiz sessions</p>

      {tests.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-[var(--muted)]">No test records yet. Finish a quiz to create one.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tests.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tests/${t.id}`}
                className="block rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--border)]/25 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      {t.type === 'daily' ? 'Daily Quiz' : 'Weekly Test'}
                      <span className="text-[var(--muted)] font-normal ml-2">{labelFor(t)}</span>
                    </p>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      Completed: {new Date(t.completed_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--accent)]">{t.score_percent.toFixed(2)}%</p>
                    <p className="text-sm text-[var(--muted)]">{t.correct_answers} / {t.total_questions}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
