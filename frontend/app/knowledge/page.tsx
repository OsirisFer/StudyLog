'use client'

import { useEffect, useMemo, useState } from 'react'
import { getKnowledge, type KnowledgeItem } from '@/lib/api'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 350

type Filters = {
  q: string
  tag: string
  from: string
  to: string
}

function useDebouncedFilters(filters: Filters, delay: number): Filters {
  const [debounced, setDebounced] = useState(filters)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(filters), delay)
    return () => clearTimeout(id)
  }, [filters, delay])
  return debounced
}

export default function KnowledgePage() {
  const [filters, setFilters] = useState<Filters>({ q: '', tag: '', from: '', to: '' })
  const debounced = useDebouncedFilters(filters, DEBOUNCE_MS)

  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeFiltersLabel = useMemo(() => {
    const parts: string[] = []
    if (debounced.q) parts.push(`search: “${debounced.q}”`)
    if (debounced.tag) parts.push(`tag: ${debounced.tag}`)
    if (debounced.from || debounced.to) parts.push(`date: ${debounced.from || '…'} – ${debounced.to || '…'}`)
    return parts.join(' • ')
  }, [debounced])

  // Initial + filter changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setOffset(0)
    setHasMore(true)

    getKnowledge({
      q: debounced.q || undefined,
      tag: debounced.tag || undefined,
      from: debounced.from || undefined,
      to: debounced.to || undefined,
      limit: PAGE_SIZE,
      offset: 0,
    })
      .then((data) => {
        if (cancelled) return
        setItems(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load knowledge')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced])

  const loadMore = async () => {
    if (!hasMore || loading) return
    const nextOffset = offset + PAGE_SIZE
    setLoading(true)
    setError(null)
    try {
      const data = await getKnowledge({
        q: debounced.q || undefined,
        tag: debounced.tag || undefined,
        from: debounced.from || undefined,
        to: debounced.to || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      })
      setItems((prev) => [...prev, ...data])
      setOffset(nextOffset)
      setHasMore(data.length === PAGE_SIZE)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      setLoading(false)
    }
  }

  const onChange = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">Knowledge Base</h1>
        <p className="text-[var(--muted)]">
          All accumulated questions generated from your notes across all dates.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="search"
            placeholder="Search questions, answers, explanations…"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <input
            type="text"
            placeholder="Tag"
            value={filters.tag}
            onChange={(e) => onChange({ tag: e.target.value })}
            className="w-full md:w-40 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ from: e.target.value })}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ to: e.target.value })}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="flex-1 text-xs text-[var(--muted)] md:text-right">
            {activeFiltersLabel || 'No filters applied'}
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-[var(--wrong)]">{error}</p>
      )}

      <section className="space-y-3">
        {items.length === 0 && !loading && !error && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-[var(--muted)]">No knowledge items found.</p>
          </div>
        )}
        {items.map((item) => (
          <KnowledgeRow key={item.id} item={item} />
        ))}
      </section>

      <div className="flex items-center justify-center pt-2">
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:bg-[var(--border)]/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        )}
        {!hasMore && items.length > 0 && (
          <span className="text-xs text-[var(--muted)]">End of results</span>
        )}
      </div>
    </div>
  )
}

function KnowledgeRow({ item }: { item: KnowledgeItem }) {
  const [show, setShow] = useState(false)

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)] mb-1">{item.source_date}</p>
          <p className="font-medium text-[var(--text)] mb-2">{item.question_text}</p>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-[var(--muted)] shrink-0">
          <div>Wrong: {item.wrong_count}</div>
          <div>Streak: {item.correct_streak}</div>
        </div>
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          {show ? 'Hide answer' : 'Show answer'}
        </button>
        {show && (
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-semibold text-[var(--correct)]">Answer:</span>{' '}
              <span>{item.correct_option}</span>
            </p>
            {item.explanation && (
              <p className="text-sm text-[var(--muted)]">{item.explanation}</p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

