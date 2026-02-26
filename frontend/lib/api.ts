const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const NO_STORE: RequestInit = { cache: 'no-store' }

export type DailyPage = {
  id: number
  date: string
  title: string | null
  content: string
  created_at: string
  updated_at: string
}

export type QuestionWithOptions = {
  id: number
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  wrong_count: number
  correct_streak: number
}

export async function getDailyPages(): Promise<DailyPage[]> {
  const r = await fetch(`${API}/daily-pages`, NO_STORE)
  if (!r.ok) throw new Error('Failed to fetch pages')
  return r.json()
}

export async function getDailyPage(date: string): Promise<DailyPage | null> {
  const r = await fetch(`${API}/daily-pages/${date}`, NO_STORE)
  if (r.status === 404) return null
  if (!r.ok) throw new Error('Failed to fetch page')
  return r.json()
}

export async function createDailyPage(date: string, title?: string, content?: string): Promise<DailyPage> {
  const r = await fetch(`${API}/daily-pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, title: title ?? null, content: content ?? '' }),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.detail || 'Failed to create page')
  }
  return r.json()
}

export async function updateDailyPage(date: string, data: { title?: string; content?: string }): Promise<DailyPage> {
  const r = await fetch(`${API}/daily-pages/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to update page')
  return r.json()
}

export async function generateQuiz(date: string): Promise<unknown[]> {
  const r = await fetch(`${API}/daily-pages/${date}/generate-quiz`, { method: 'POST' })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.detail || 'Failed to generate quiz')
  }
  return r.json()
}

export async function getDailyQuiz(date: string, n: number = 10): Promise<{ date: string; questions: QuestionWithOptions[] }> {
  const r = await fetch(`${API}/quiz/daily?date=${encodeURIComponent(date)}&n=${n}`, NO_STORE)
  if (!r.ok) throw new Error('Failed to fetch quiz')
  return r.json()
}

export async function getWeeklyQuiz(start: string, end: string, n: number = 20): Promise<{ start: string; end: string; questions: QuestionWithOptions[] }> {
  const r = await fetch(`${API}/quiz/weekly?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&n=${n}`, NO_STORE)
  if (!r.ok) throw new Error('Failed to fetch quiz')
  return r.json()
}

export async function submitAttempt(questionId: number, selectedOption: string, wasCorrect: boolean): Promise<void> {
  const r = await fetch(`${API}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: questionId, selected_option: selectedOption, was_correct: wasCorrect }),
  })
  if (!r.ok) throw new Error('Failed to submit attempt')
}

// ----- Test History -----
export type TestType = 'daily' | 'weekly'

export type TestRecord = {
  id: number
  type: TestType
  date: string | null
  start: string | null
  end: string | null
  total_questions: number
  correct_answers: number
  score_percent: number
  completed_at: string
}

export type TestMistake = {
  id: number
  question_id: number | null
  question_text: string
  selected_option: string
  correct_answer: string
  explanation: string | null
}

export type TestRecordDetail = TestRecord & { mistakes: TestMistake[] }

export async function listTests(): Promise<TestRecord[]> {
  const r = await fetch(`${API}/tests`, NO_STORE)
  if (!r.ok) throw new Error('Failed to fetch tests')
  return r.json()
}

export async function getTest(id: number): Promise<TestRecordDetail> {
  const r = await fetch(`${API}/tests/${id}`, NO_STORE)
  if (!r.ok) throw new Error('Failed to fetch test')
  return r.json()
}

export async function createTestRecord(body: {
  type: TestType
  date?: string
  start?: string
  end?: string
  total_questions: number
  correct_answers: number
  mistakes: Array<{
    question_id?: number
    question_text: string
    selected_option: string
    correct_answer: string
    explanation?: string | null
  }>
}): Promise<TestRecord> {
  const r = await fetch(`${API}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.detail || 'Failed to create test record')
  }
  return r.json()
}

// ----- Knowledge base -----
export type KnowledgeItem = {
  id: number
  source_date: string
  question_text: string
  options: string[]
  correct_option: string
  explanation: string | null
  tags: string[]
  wrong_count: number
  correct_streak: number
  created_at: string
}

export type KnowledgeQuery = {
  q?: string
  tag?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export async function getKnowledge(params: KnowledgeQuery = {}): Promise<KnowledgeItem[]> {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.tag) search.set('tag', params.tag)
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.offset != null) search.set('offset', String(params.offset))
  const qs = search.toString()
  const r = await fetch(`${API}/knowledge${qs ? `?${qs}` : ''}`, NO_STORE)
  if (!r.ok) throw new Error('Failed to fetch knowledge')
  return r.json()
}
