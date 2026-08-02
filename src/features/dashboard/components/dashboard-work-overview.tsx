import { DashboardActivityPreview } from '@/features/dashboard/components/dashboard-activity-preview'
import { DashboardGreeting } from '@/features/dashboard/components/dashboard-greeting'
import { DashboardInboxSection } from '@/features/dashboard/components/dashboard-inbox-section'
import { DashboardInformationSection } from '@/features/dashboard/components/dashboard-information-section'
import { DashboardOverviewStrip } from '@/features/dashboard/components/dashboard-overview-strip'
import { DashboardPriorityTasks } from '@/features/dashboard/components/dashboard-priority-tasks'
import { DashboardWeeklyGoal } from '@/features/dashboard/components/dashboard-weekly-goal'
import {
  countOverdueOpenTasks,
  selectPriorityTasksForDashboard,
} from '@/features/dashboard/lib/dashboard-priority-tasks'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import type { TaskActivityItem } from '@/features/activity/types/task-activity'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { InformationItem } from '@/features/information/types/information-item'
import type { Task } from '@/features/tasks/types/task'

type DashboardWorkOverviewProps = {
  user: {
    user_metadata?: Record<string, unknown>
  }
  unprocessedInboxItems: InboxItem[]
  openTasks: Task[]
  informationItems: InformationItem[]
  activityItems: TaskActivityItem[]
  memberNameMap: Record<string, string>
}

export function DashboardWorkOverview({
  user,
  unprocessedInboxItems,
  openTasks,
  informationItems,
  activityItems,
  memberNameMap,
}: DashboardWorkOverviewProps) {
  const safeUnprocessedInboxItems = Array.isArray(unprocessedInboxItems)
    ? unprocessedInboxItems
    : []
  const safeOpenTasks = Array.isArray(openTasks) ? openTasks : []
  const safeInformationItems = Array.isArray(informationItems) ? informationItems : []
  const safeActivityItems = Array.isArray(activityItems) ? activityItems : []

  const unprocessedInboxCount = sanitizeDashboardCount(safeUnprocessedInboxItems.length)
  const openTaskCount = safeOpenTasks.length
  const informationCount = safeInformationItems.length
  const overdueTaskCount = countOverdueOpenTasks(safeOpenTasks)
  const priorityTasks = selectPriorityTasksForDashboard(safeOpenTasks)

  return (
    <div className="space-y-5 lg:space-y-5">
      <DashboardGreeting
        user={user}
        unprocessedInboxCount={unprocessedInboxCount}
        openTaskCount={openTaskCount}
        informationCount={informationCount}
      />

      <DashboardOverviewStrip
        unprocessedInboxCount={unprocessedInboxCount}
        openTaskCount={openTaskCount}
        overdueTaskCount={overdueTaskCount}
        informationCount={informationCount}
      />

      <div className="grid items-start gap-4 xl:grid-cols-12 xl:gap-4">
        <div className="xl:col-span-6">
          <DashboardInboxSection items={safeUnprocessedInboxItems} />
        </div>
        <div className="xl:col-span-3">
          <DashboardPriorityTasks
            tasks={priorityTasks}
            memberNameMap={memberNameMap}
          />
        </div>
        <div className="xl:col-span-3">
          <DashboardInformationSection
            items={safeInformationItems}
            memberNameMap={memberNameMap}
          />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-4">
        <DashboardWeeklyGoal />
        <DashboardActivityPreview items={safeActivityItems} />
      </div>
    </div>
  )
}
