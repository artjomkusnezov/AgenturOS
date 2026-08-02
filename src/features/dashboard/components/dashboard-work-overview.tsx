import { DashboardAttentionSection } from '@/features/dashboard/components/dashboard-attention-section'
import { DashboardGoalsSection } from '@/features/dashboard/components/dashboard-goals-section'
import { DashboardGreeting } from '@/features/dashboard/components/dashboard-greeting'
import { DashboardInboxSection } from '@/features/dashboard/components/dashboard-inbox-section'
import { DashboardMyTasksSection } from '@/features/dashboard/components/dashboard-my-tasks-section'
import { DashboardMyWorkSection } from '@/features/dashboard/components/dashboard-my-work-section'
import { DashboardTeamTasksSection } from '@/features/dashboard/components/dashboard-team-tasks-section'
import type { DashboardAttentionItem } from '@/features/dashboard/lib/dashboard-attention'
import type {
  DashboardCaseTypeCount,
  DashboardMyWorkCaseItem,
} from '@/features/dashboard/lib/dashboard-my-work'
import type { DashboardTaskItem, DashboardTeamTasksResult } from '@/features/dashboard/lib/dashboard-tasks'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type DashboardWorkOverviewProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxItems: InboxItem[]
  attentionItems: DashboardAttentionItem[]
  attentionCount: number
  myTasks: DashboardTaskItem[]
  myOpenTaskCount: number
  teamTasks: DashboardTeamTasksResult
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
  memberNameMap?: Record<string, string>
}

export function DashboardWorkOverview({
  user,
  unprocessedInboxItems,
  attentionItems,
  attentionCount,
  myTasks,
  myOpenTaskCount,
  teamTasks,
  caseTypeCounts,
  recentlyUpdated,
  memberNameMap = {},
}: DashboardWorkOverviewProps) {
  const safeInboxItems = Array.isArray(unprocessedInboxItems) ? unprocessedInboxItems : []
  const safeAttentionItems = Array.isArray(attentionItems) ? attentionItems : []
  const safeMyTasks = Array.isArray(myTasks) ? myTasks : []
  const safeCaseTypeCounts = Array.isArray(caseTypeCounts) ? caseTypeCounts : []
  const safeRecentlyUpdated = Array.isArray(recentlyUpdated) ? recentlyUpdated : []

  const unprocessedInboxCount = sanitizeDashboardCount(safeInboxItems.length)
  const safeAttentionCount = sanitizeDashboardCount(attentionCount)
  const safeMyOpenTaskCount = sanitizeDashboardCount(myOpenTaskCount)
  const safeTeamOpenTaskCount = sanitizeDashboardCount(teamTasks.totalTeamOpenCount)

  return (
    <div className="space-y-4 lg:space-y-5">
      <DashboardGreeting
        user={user}
        unprocessedInboxCount={unprocessedInboxCount}
        attentionCount={safeAttentionCount}
        myOpenTaskCount={safeMyOpenTaskCount}
        teamOpenTaskCount={safeTeamOpenTaskCount}
      />

      <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-4">
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <DashboardInboxSection items={safeInboxItems} memberNameMap={memberNameMap} />
        </div>

        <div className="order-2 lg:col-start-2 lg:row-start-1">
          <DashboardAttentionSection
            items={safeAttentionItems}
            totalCount={safeAttentionCount}
          />
        </div>

        <div className="order-3 lg:order-6 lg:col-start-1 lg:row-start-2">
          <DashboardMyTasksSection tasks={safeMyTasks} totalCount={safeMyOpenTaskCount} />
        </div>

        <div className="order-4 lg:col-start-2 lg:row-start-2">
          <DashboardTeamTasksSection teamTasks={teamTasks} />
        </div>

        <div className="order-5 lg:col-start-3 lg:row-start-2">
          <DashboardMyWorkSection
            caseTypeCounts={safeCaseTypeCounts}
            recentlyUpdated={safeRecentlyUpdated}
          />
        </div>

        <div className="order-6 lg:order-3 lg:col-start-3 lg:row-start-1">
          <DashboardGoalsSection />
        </div>
      </div>
    </div>
  )
}
