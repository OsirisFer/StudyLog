'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/quiz/daily', label: "Today's Quiz" },
  { href: '/quiz/weekly', label: 'Weekly Test' },
  { href: '/tests', label: 'Test History' },
  { href: '/knowledge', label: 'Knowledge' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/" className="text-lg font-semibold text-[var(--accent)]">
          StudyLog
        </Link>
      </div>
      <nav className="p-2 flex flex-col gap-0.5">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-md text-sm ${
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-medium'
                : 'text-[var(--muted)] hover:bg-[var(--border)]/50 hover:text-[var(--text)]'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
