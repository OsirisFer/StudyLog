'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { API_BASE } from '@/lib/api'

export function DeleteDailyPageButton({ date }: { date: string }) {
    const router = useRouter()
    return (
        <button
            onClick={async (e) => {
                e.preventDefault()
                if (confirm('Delete this daily page?')) {
                    await fetch(`${API_BASE}/daily-pages/${date}`, { method: 'DELETE' })
                    router.refresh()
                }
            }}
            className="p-1 text-[var(--muted)] hover:text-[var(--wrong)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Delete daily page"
        >
            <Trash2 size={16} />
        </button>
    )
}
