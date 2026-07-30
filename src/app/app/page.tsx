import { createClient } from '@/lib/supabase/server'
import { DashboardWorkOverview } from '@/features/dashboard/components/dashboard-work-overview'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { listTasksForCurrentUser } from '@/features/tasks/repositories/tasks-repository'

export default async function AppDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        Sie sind nicht angemeldet.
      </div>
    )
  }

  const [inboxResult, tasksResult, informationResult] = await Promise.all([
    listInboxItemsForCurrentUser(),
    listTasksForCurrentUser(),
    listInformationItemsForCurrentUser(),
  ])

  if (!inboxResult.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {inboxResult.error}
      </div>
    )
  }

  if (!tasksResult.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {tasksResult.error}
      </div>
    )
  }

  if (!informationResult.success) {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50 px-5 py-4 text-sm text-red-700">
        {informationResult.error}
      </div>
    )
  }

  const totalInboxCount =
    inboxResult.unprocessedItems.length + inboxResult.processedItems.length

  return (
    <DashboardWorkOverview
      user={user}
      unprocessedInboxCount={inboxResult.unprocessedItems.length}
      totalInboxCount={totalInboxCount}
      openTasks={tasksResult.openTasks}
      informationItems={informationResult.items}
    />
  )
}
