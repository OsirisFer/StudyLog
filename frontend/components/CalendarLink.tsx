'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CalendarLink() {
  const router = useRouter()
  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })

  const go = () => {
    if (!date) return
    router.push(`/daily/${date}`)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
      <button
        type="button"
        onClick={go}
        className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        Open
      </button>
    </div>
  )
}
