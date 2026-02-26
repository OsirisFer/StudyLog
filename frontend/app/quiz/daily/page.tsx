'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { DailyQuizRunner } from '@/components/DailyQuizRunner'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function DailyQuizContent() {
  const searchParams = useSearchParams()
  const date = useMemo(() => searchParams.get('date') || todayStr(), [searchParams])
  const n = useMemo(() => Math.min(50, Math.max(1, parseInt(searchParams.get('n') || '10', 10) || 10)), [searchParams])

  return (
    <>
      <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">Daily Quiz</h1>
      <p className="text-[var(--muted)] mb-6">Questions from {date} (weighted by mistakes/streak)</p>
      <DailyQuizRunner date={date} n={n} />
    </>
  )
}

export default function DailyQuizPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Suspense fallback={<p className="text-[var(--muted)]">Loading…</p>}>
        <DailyQuizContent />
      </Suspense>
    </div>
  )
}
