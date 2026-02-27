'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { DailyPage } from '@/lib/api'
import { getDailyPage, createDailyPage, updateDailyPage, generateQuiz } from '@/lib/api'

const DEBOUNCE_MS = 800

type Props = { date: string; initialPage: DailyPage | null }

export function DailyEditor({ date, initialPage }: Props) {
  const [page, setPage] = useState<DailyPage | null>(initialPage)
  const [title, setTitle] = useState(initialPage?.title ?? '')
  const [content, setContent] = useState(initialPage?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genCount, setGenCount] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertSnippet = (snippet: string, cursorOffset: number = snippet.length) => {
    if (!textareaRef.current) return
    const el = textareaRef.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const newContent = content.substring(0, start) + snippet + content.substring(end)
    setContent(newContent)

    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + cursorOffset, start + cursorOffset)
    }, 0)
  }

  const MATH_SYMBOLS = [
    { label: '∫', snippet: '∫' },
    { label: '√', snippet: '√' },
    { label: 'π', snippet: 'π' },
    { label: 'θ', snippet: 'θ' },
    { label: 'α', snippet: 'α' },
    { label: 'β', snippet: 'β' },
    { label: '≤', snippet: '≤' },
    { label: '≥', snippet: '≥' },
    { label: '≠', snippet: '≠' },
    { label: '→', snippet: '→' },
    { label: '∞', snippet: '∞' },
    { label: 'Σ', snippet: 'Σ' },
    { label: 'lim', snippet: 'lim ' },
    { label: 'log', snippet: 'log ' },
    { label: 'ln', snippet: 'ln ' },
    { label: 'sin', snippet: 'sin ' },
    { label: 'cos', snippet: 'cos ' },
    { label: 'tan', snippet: 'tan ' },
    { label: 'x²', snippet: 'x^{2}' },
    { label: 'eˣ', snippet: 'e^{x}' },
    { label: '( )', snippet: '(  )', offset: 2 },
    { label: '[ ]', snippet: '[  ]', offset: 2 },
    { label: '{ }', snippet: '\\{  \\}', offset: 3 },
    { label: 'Frac', snippet: '\\frac{ }{ }', offset: 6 },
    { label: 'd/dx', snippet: '\\frac{d}{dx} ' },
    { label: '\\( \\)', snippet: '\\(  \\)', offset: 3 },
    { label: '$$ $$', snippet: '$$\n\n$$', offset: 3 },
  ]

  const persist = useCallback(async () => {
    if (!isMounted.current) return
    try {
      if (!page) {
        const created = await createDailyPage(date, title || undefined, content)
        setPage(created)
      } else {
        const updated = await updateDailyPage(date, { title: title || undefined, content })
        setPage(updated)
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (isMounted.current) setSaving(false)
    }
  }, [date, page, title, content])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaving(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      persist()
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [title, content, persist])

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const handleGenerateQuiz = async () => {
    setGenerating(true)
    setGenError(null)
    setGenCount(null)
    try {
      if (!page) {
        await createDailyPage(date, title || undefined, content)
        const p = await getDailyPage(date)
        setPage(p ?? null)
      }
      const list = await generateQuiz(date)
      setGenCount(Array.isArray(list) ? list.length : 0)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Failed to generate quiz')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-[var(--muted)] hover:text-[var(--text)] text-sm">
          ← Dashboard
        </Link>
        <span className="text-sm text-[var(--muted)]">
          {saving ? 'Saving…' : 'Saved'}
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">{date}</h1>
      <p className="text-sm text-[var(--muted)] mb-6">Daily study notes (autosave)</p>

      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-lg placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
      />

      <div className="mb-2 flex flex-wrap gap-1 p-2 rounded-md border border-[var(--border)] bg-[var(--card)]/50">
        {MATH_SYMBOLS.map((sym, i) => (
          <button
            key={i}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault() // Prevents textarea from losing focus before insert
              insertSnippet(sym.snippet, sym.offset)
            }}
            className="px-2 py-1 text-xs font-mono rounded hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors focus:outline-none"
            title={sym.label}
          >
            {sym.label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        placeholder="Write your notes here…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[320px] rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y font-mono text-sm"
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateQuiz}
          disabled={generating || (content.trim().length < 20)}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {generating ? 'Generating…' : 'Generate quiz for today'}
        </button>
        <Link
          href={`/quiz/daily?date=${date}`}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:bg-[var(--border)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          Start today&apos;s quiz
        </Link>
        {genCount !== null && (
          <span className="text-sm text-[var(--muted)]">
            Generated {genCount} question{genCount !== 1 ? 's' : ''}.
          </span>
        )}
        {genError && (
          <span className="text-sm text-[var(--wrong)]">{genError}</span>
        )}
      </div>
    </>
  )
}
