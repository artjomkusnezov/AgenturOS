import { listTaskActivityForCurrentUser } from '@/features/activity/repositories/task-activity-repository'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import { DashboardErrorBanner } from '@/features/dashboard/components/dashboard-error-banner'
import { DashboardWorkOverview } from '@/features/dashboard/components/dashboard-work-overview'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
import { listTasksForCurrentUser } from '@/features/tasks/repositories/tasks-repository'
import { createClient } from '@/lib/supabase/server'

export async function DashboardPageContent() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return <DashboardErrorBanner message="Sie sind nicht angemeldet." />
  }

  const [inboxResult, tasksResult, informationResult, membersResult, activityResult] =
    await Promise.all([
      listInboxItemsForCurrentUser(),
      listTasksForCurrentUser(),
      listInformationItemsForCurrentUser(),
      listCurrentAgencyMembers(),
      listTaskActivityForCurrentUser({ limit: 3 }),
    ])

  if (!inboxResult.success || !tasksResult.success || !informationResult.success) {
    const errors = [
      !inboxResult.success ? inboxResult.error : null,
      !tasksResult.success ? tasksResult.error : null,
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

  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}
  const activityItems = activityResult.success ? activityResult.items : []

  return (
    <DashboardWorkOverview
      user={user}
      unprocessedInboxItems={inboxResult.unprocessedItems}
      openTasks={tasksResult.openTasks}
      informationItems={informationResult.items}
      activityItems={activityItems}
      memberNameMap={memberNameMap}
    />
  )
}
