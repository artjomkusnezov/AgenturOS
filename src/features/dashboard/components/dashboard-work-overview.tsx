import { getGermanDateLabel } from '@/lib/user/get-display-name'
import {
  getFirstNameFromUser,
  getTimeOfDayGreeting,
  getWorkSituationHint,
} from '@/features/dashboard/lib/dashboard-greeting'
import { DashboardOpenTasks } from '@/features/dashboard/components/dashboard-open-tasks'
import { DashboardQuickActions } from '@/features/dashboard/components/dashboard-quick-actions'
import { DashboardRecentInformation } from '@/features/dashboard/components/dashboard-recent-information'
import { DashboardSummaryCards } from '@/features/dashboard/components/dashboard-summary-cards'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import type { InformationItem } from '@/features/information/types/information-item'
import type { Task } from '@/features/tasks/types/task'

type DashboardWorkOverviewProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxCount: number
  totalInboxCount: number
  openTasks: Task[]
  informationItems: InformationItem[]
}

export function DashboardWorkOverview({
  user,
  unprocessedInboxCount,
  totalInboxCount,
  openTasks,
  informationItems,
}: DashboardWorkOverviewProps) {
  const safeUnprocessedInboxCount = sanitizeDashboardCount(unprocessedInboxCount)
  const safeTotalInboxCount = sanitizeDashboardCount(totalInboxCount)
  const safeOpenTasks = Array.isArray(openTasks) ? openTasks : []
  const safeInformationItems = Array.isArray(informationItems) ? informationItems : []

  const greeting = getTimeOfDayGreeting()
  const firstName = getFirstNameFromUser(user)
  const situationHint = getWorkSituationHint({
    unprocessedInboxCount: safeUnprocessedInboxCount,
    openTaskCount: safeOpenTasks.length,
    informationCount: safeInformationItems.length,
  })

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="space-y-2 pb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {getGermanDateLabel()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-[0.9375rem]"
          aria-live="polite"
        >
          {situationHint}
        </p>
      </header>

      <DashboardSummaryCards
        unprocessedInboxCount={safeUnprocessedInboxCount}
        totalInboxCount={safeTotalInboxCount}
        openTaskCount={safeOpenTasks.length}
        informationCount={safeInformationItems.length}
      />

      <div className="grid gap-6 md:grid-cols-2 md:items-stretch xl:gap-8">
        <DashboardOpenTasks tasks={safeOpenTasks} />
        <DashboardRecentInformation items={safeInformationItems} />
      </div>

      <DashboardQuickActions />
    </div>
  )
}
