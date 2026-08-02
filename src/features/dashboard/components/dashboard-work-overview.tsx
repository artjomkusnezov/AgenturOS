import type { TaskActivityItem } from '@/features/activity/types/task-activity'
import { DashboardAttentionSection } from '@/features/dashboard/components/dashboard-attention-section'
import { DashboardGreeting } from '@/features/dashboard/components/dashboard-greeting'
import { DashboardInboxSection } from '@/features/dashboard/components/dashboard-inbox-section'
import { DashboardMyWorkSection } from '@/features/dashboard/components/dashboard-my-work-section'
import type { DashboardAttentionItem } from '@/features/dashboard/lib/dashboard-attention'
import type { DashboardMyWorkCaseItem } from '@/features/dashboard/lib/dashboard-my-work'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Task } from '@/features/tasks/types/task'

type DashboardWorkOverviewProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxItems: InboxItem[]
  attentionItems: DashboardAttentionItem[]
  attentionCount: number
  myOpenCases: DashboardMyWorkCaseItem[]
  myOpenTasks: Task[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
  activityItems: TaskActivityItem[]
  memberNameMap: Record<string, string>
}

export function DashboardWorkOverview({
  user,
  unprocessedInboxItems,
  attentionItems,
  attentionCount,
  myOpenCases,
  myOpenTasks,
  recentlyUpdated,
  activityItems,
  memberNameMap,
}: DashboardWorkOverviewProps) {
  const safeInboxItems = Array.isArray(unprocessedInboxItems) ? unprocessedInboxItems : []
  const safeAttentionItems = Array.isArray(attentionItems) ? attentionItems : []
  const safeMyOpenCases = Array.isArray(myOpenCases) ? myOpenCases : []
  const safeMyOpenTasks = Array.isArray(myOpenTasks) ? myOpenTasks : []
  const safeRecentlyUpdated = Array.isArray(recentlyUpdated) ? recentlyUpdated : []
  const safeActivityItems = Array.isArray(activityItems) ? activityItems : []

  const unprocessedInboxCount = sanitizeDashboardCount(safeInboxItems.length)
  const safeAttentionCount = sanitizeDashboardCount(attentionCount)
  const myOpenWorkCount = sanitizeDashboardCount(
    safeMyOpenCases.length + safeMyOpenTasks.length,
  )

  return (
    <div className="space-y-8 lg:space-y-10">
      <DashboardGreeting
        user={user}
        unprocessedInboxCount={unprocessedInboxCount}
        attentionCount={safeAttentionCount}
        myOpenWorkCount={myOpenWorkCount}
      />

      {/* 1. Neue Eingänge — immer ganz oben */}
      <DashboardInboxSection items={safeInboxItems} />

      {/* 2. Braucht Aufmerksamkeit — Dringlichkeit, nicht Modul */}
      <DashboardAttentionSection
        items={safeAttentionItems}
        totalCount={safeAttentionCount}
      />

      {/* 3. Meine Arbeit — ruhig, darunter */}
      <DashboardMyWorkSection
        myOpenCases={safeMyOpenCases}
        myOpenTasks={safeMyOpenTasks}
        recentlyUpdated={safeRecentlyUpdated}
        activityItems={safeActivityItems}
        memberNameMap={memberNameMap}
      />
    </div>
  )
}
