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
  const greeting = getTimeOfDayGreeting()
  const firstName = getFirstNameFromUser(user)
  const situationHint = getWorkSituationHint({
    unprocessedInboxCount,
    openTaskCount: openTasks.length,
    informationCount: informationItems.length,
  })

  return (
    <div className="space-y-8">
      <section className="pb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {getGermanDateLabel()}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          {situationHint}
        </p>
      </section>

      <DashboardSummaryCards
        unprocessedInboxCount={unprocessedInboxCount}
        totalInboxCount={totalInboxCount}
        openTaskCount={openTasks.length}
        informationCount={informationItems.length}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardOpenTasks tasks={openTasks} />
        <DashboardRecentInformation items={informationItems} />
      </div>

      <DashboardQuickActions />
    </div>
  )
}
