import { listTaskActivityForCurrentUser } from '@/features/activity/repositories/task-activity-repository'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { mapCaseRecordToTask } from '@/features/cases/lib/map-case-to-task'
import { listCasesForWorkspaceViewFilters } from '@/features/cases/repositories/list-cases-for-workspace-view'
import { DashboardErrorBanner } from '@/features/dashboard/components/dashboard-error-banner'
import { DashboardWorkOverview } from '@/features/dashboard/components/dashboard-work-overview'
import type { DashboardViewBucket } from '@/features/dashboard/components/dashboard-view-buckets'
import { selectPriorityTasksForDashboard } from '@/features/dashboard/lib/dashboard-priority-tasks'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import type { Task } from '@/features/tasks/types/task'
import { listDashboardWorkspaceViews } from '@/features/workspace-views/repositories/workspace-views-repository'
import { createClient } from '@/lib/supabase/server'

type LoadedBucket = DashboardViewBucket & {
  mappedTasks: Task[]
}

export async function DashboardPageContent() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return <DashboardErrorBanner message="Sie sind nicht angemeldet." />
  }

  const [
    inboxResult,
    informationResult,
    membersResult,
    activityResult,
    dashboardViewsResult,
  ] = await Promise.all([
    listInboxItemsForCurrentUser(),
    listInformationItemsForCurrentUser(),
    listCurrentAgencyMembers(),
    listTaskActivityForCurrentUser({ limit: 3 }),
    listDashboardWorkspaceViews(),
  ])

  if (!inboxResult.success || !informationResult.success) {
    const errors = [
      !inboxResult.success ? inboxResult.error : null,
      !informationResult.success ? informationResult.error : null,
    ].filter((message): message is string => message !== null)

    return (
      <div className="space-y-3" role="alert" aria-live="polite">
        {errors.map((message) => (
          <DashboardErrorBanner key={message} message={message} />
        ))}
      </div>
    )
  }

  const dashboardViews = dashboardViewsResult.success
    ? dashboardViewsResult.views
    : []

  const loadedBuckets: LoadedBucket[] = await Promise.all(
    dashboardViews.map(async (view) => {
      const casesResult = await listCasesForWorkspaceViewFilters({
        filters: view.filters,
        sort: view.sort,
      })

      if (!casesResult.success) {
        return {
          view,
          count: 0,
          priorityTasks: [],
          mappedTasks: [],
        }
      }

      const mappedTasks = casesResult.cases
        .filter((row) => row.source_task_id)
        .map((row) => mapCaseRecordToTask(row))

      return {
        view,
        count: casesResult.cases.length,
        priorityTasks:
          view.key === 'tasks'
            ? selectPriorityTasksForDashboard(mappedTasks)
            : [],
        mappedTasks,
      }
    }),
  )

  const tasksLoaded = loadedBuckets.find((bucket) => bucket.view.key === 'tasks')
  const openTasks = tasksLoaded?.mappedTasks ?? []
  const viewBuckets: DashboardViewBucket[] = loadedBuckets.map(
    ({ mappedTasks: _mappedTasks, ...bucket }) => {
      void _mappedTasks
      return bucket
    },
  )

  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}
  const activityItems = activityResult.success ? activityResult.items : []

  return (
    <DashboardWorkOverview
      user={user}
      unprocessedInboxItems={inboxResult.unprocessedItems}
      openTasks={openTasks}
      informationItems={informationResult.items}
      activityItems={activityItems}
      memberNameMap={memberNameMap}
      viewBuckets={viewBuckets}
    />
  )
}
