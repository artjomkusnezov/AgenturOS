import Link from 'next/link'

import { AppNavIconGlyph } from '@/components/app/app-icons'
import type { AppNavIcon } from '@/config/app-navigation'
import {
  getInboxCardDescription,
  getInformationCardDescription,
  getTasksCardDescription,
} from '@/features/dashboard/lib/dashboard-greeting'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

type DashboardSummaryCardsProps = {
  unprocessedInboxCount: number
  totalInboxCount: number
  openTaskCount: number
  informationCount: number
}

type SummaryCardProps = {
  href: string
  title: string
  icon: AppNavIcon
  count: number
  description: string
}

function SummaryCard({ href, title, icon, count, description }: SummaryCardProps) {
  return (
    <Link
      href={href}
      aria-label={`${title}: ${count}. ${description}. Zum Modul wechseln.`}
      className="group flex h-full min-h-[9.5rem] flex-col rounded-xl border border-zinc-200/60 bg-white p-5 shadow-sm ring-1 ring-zinc-200/40 transition-all duration-150 hover:border-zinc-300/80 hover:bg-zinc-50/60 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        <span className="rounded-lg bg-zinc-100 p-2 text-zinc-500 transition-colors duration-150 group-hover:bg-accent/10 group-hover:text-accent">
          <AppNavIconGlyph icon={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
        {count}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{description}</p>
      <p className="mt-auto pt-4 text-xs font-medium text-accent transition-colors duration-150 group-hover:text-accent/90">
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
  const safeUnprocessedCount = sanitizeDashboardCount(unprocessedInboxCount)
  const safeTotalInboxCount = sanitizeDashboardCount(totalInboxCount)
  const safeOpenTaskCount = sanitizeDashboardCount(openTaskCount)
  const safeInformationCount = sanitizeDashboardCount(informationCount)

  return (
    <section aria-label="Modulübersicht">
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          href="/app/inbox"
          title="Eingänge"
          icon="inbox"
          count={safeUnprocessedCount}
          description={getInboxCardDescription(safeUnprocessedCount, safeTotalInboxCount)}
        />
        <SummaryCard
          href="/app/tasks"
          title="Aufgaben"
          icon="tasks"
          count={safeOpenTaskCount}
          description={getTasksCardDescription(safeOpenTaskCount)}
        />
        <SummaryCard
          href="/app/information"
          title="Informationen"
          icon="information"
          count={safeInformationCount}
          description={getInformationCardDescription(safeInformationCount)}
        />
      </div>
    </section>
  )
}
