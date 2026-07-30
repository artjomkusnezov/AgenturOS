import Link from 'next/link'

import {
  getInboxCardDescription,
  getInformationCardDescription,
  getTasksCardDescription,
} from '@/features/dashboard/lib/dashboard-greeting'

type DashboardSummaryCardsProps = {
  unprocessedInboxCount: number
  totalInboxCount: number
  openTaskCount: number
  informationCount: number
}

type SummaryCardProps = {
  href: string
  title: string
  count: number
  description: string
}

function SummaryCard({ href, title, count, description }: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200/60 bg-white p-5 shadow-sm ring-1 ring-zinc-200/40 transition-colors duration-150 hover:border-zinc-300/80 hover:bg-zinc-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{count}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{description}</p>
      <p className="mt-4 text-xs font-medium text-accent group-hover:text-accent/90">
        Zum Modul →
      </p>
    </Link>
  )
}

export function DashboardSummaryCards({
  unprocessedInboxCount,
  totalInboxCount,
  openTaskCount,
  informationCount,
}: DashboardSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        href="/app/inbox"
        title="Eingänge"
        count={unprocessedInboxCount}
        description={getInboxCardDescription(unprocessedInboxCount, totalInboxCount)}
      />
      <SummaryCard
        href="/app/tasks"
        title="Aufgaben"
        count={openTaskCount}
        description={getTasksCardDescription(openTaskCount)}
      />
      <SummaryCard
        href="/app/information"
        title="Informationen"
        count={informationCount}
        description={getInformationCardDescription(informationCount)}
      />
    </div>
  )
}
