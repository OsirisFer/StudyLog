import Link from 'next/link'
import { getDailyPages } from '@/lib/api'
import { CalendarLink } from '@/components/CalendarLink'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const pages = await getDailyPages()
  const sorted = [...pages].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-2">Dashboard</h1>
      <p className="text-[var(--muted)] mb-6">
        Write daily notes, generate quizzes, and take weekly tests.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <CalendarLink />
        <span className="text-sm text-[var(--muted)]">Pick a date to open or create a page</span>
      </div>

      <section>
        <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
          Recent days
        </h2>
        <ul className="space-y-1">
          {sorted.length === 0 ? (
            <li className="text-[var(--muted)] py-4">No pages yet. Pick a date above to start.</li>
          ) : (
            sorted.slice(0, 14).map((p) => (
              <li key={p.date}>
                <Link
                  href={`/daily/${p.date}`}
                  className="block py-2 px-3 rounded-md hover:bg-[var(--border)]/50 text-[var(--text)]"
                >
                  <span className="font-medium">{p.date}</span>
                  {p.title && <span className="text-[var(--muted)] ml-2">— {p.title}</span>}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
