import { notFound } from 'next/navigation'
import { getDailyPage } from '@/lib/api'
import { DailyEditor } from '@/components/DailyEditor'

type Props = { params: Promise<{ date: string }> }

export async function generateMetadata({ params }: Props) {
  const { date } = await params
  return { title: `${date} — StudyLog` }
}

export default async function DailyPage({ params }: Props) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const page = await getDailyPage(date)
  return (
    <div className="max-w-3xl mx-auto p-6">
      <DailyEditor date={date} initialPage={page} />
    </div>
  )
}
