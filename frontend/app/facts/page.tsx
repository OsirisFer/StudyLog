'use client'

import { useEffect, useMemo, useState } from 'react'
import { getKnowledge, type KnowledgeItem } from '@/lib/api'
import { MathText } from '@/components/MathText'

const PAGE_SIZE = 200 // Fetch a large amount of items so it's a continuous document (backend max is 200)
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

export default function FactsPage() {
    const [filters, setFilters] = useState<Filters>({ q: '', tag: '', from: '', to: '' })
    const debounced = useDebouncedFilters(filters, DEBOUNCE_MS)

    const [items, setItems] = useState<KnowledgeItem[]>([])
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

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
                setError(e instanceof Error ? e.message : 'Failed to load facts')
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

    // Generate continuous text content grouped by date
    const fullTextContent = useMemo(() => {
        if (items.length === 0) return ''

        // Group items by date
        const grouped = items.reduce((acc, item) => {
            const date = item.source_date
            if (!acc[date]) acc[date] = []
            acc[date].push(item.correct_option)
            return acc
        }, {} as Record<string, string[]>)

        // Build the continuous text block
        const lines: string[] = []

        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

        for (const date of sortedDates) {
            lines.push(date)
            // Deduplicate facts within a date just in case
            const uniqueFacts = Array.from(new Set(grouped[date]))
            for (const fact of uniqueFacts) {
                // Strip out trailing periods if they exist, but keep format plain.
                // Assuming fact is directly "La derivada de x es 1"
                lines.push(fact)
            }
            lines.push('') // empty line after each date group
        }

        // Remove the very last empty line
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop()
        }

        return lines.join('\n')
    }, [items])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullTextContent)
            setCopyStatus('copied')
            setTimeout(() => setCopyStatus('idle'), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    const handleExport = () => {
        const blob = new Blob([fullTextContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `StudyLog_Facts_${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 flex flex-col h-[calc(100vh-3rem)]">
            <header className="shrink-0 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">Facts Notes</h1>
                    <p className="text-[var(--muted)]">
                        Continuous text document of all accumulated knowledge facts.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        disabled={items.length === 0}
                        className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--border)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={items.length === 0}
                        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Export .txt
                    </button>
                </div>
            </header>

            <section className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <input
                        type="search"
                        placeholder="Search facts…"
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
                <p className="shrink-0 text-sm text-[var(--wrong)]">{error}</p>
            )}

            <section className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                    {items.length === 0 && !loading && !error ? (
                        <p className="text-[var(--muted)] text-center mt-4">No facts found.</p>
                    ) : (
                        <div className="whitespace-pre-wrap font-mono text-sm text-[var(--text)] leading-relaxed">
                            <MathText content={fullTextContent} />
                            {loading && <div className="mt-4 text-[var(--muted)] italic">Loading facts…</div>}
                        </div>
                    )}
                    {hasMore && !loading && items.length > 0 && (
                        <div className="flex items-center justify-center pt-6">
                            <button
                                type="button"
                                onClick={loadMore}
                                className="text-xs font-medium text-[var(--accent)] hover:underline"
                            >
                                Load more facts down below…
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
