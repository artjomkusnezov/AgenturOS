import { createClient } from '@/lib/supabase/server'
import { DashboardErrorBanner } from '@/features/dashboard/components/dashboard-error-banner'
import { DashboardWorkOverview } from '@/features/dashboard/components/dashboard-work-overview'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { listInformationItemsForCurrentUser } from '@/features/information/repositories/information-repository'
import { listTasksForCurrentUser } from '@/features/tasks/repositories/tasks-repository'

export async function DashboardPageContent() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return <DashboardErrorBanner message="Sie sind nicht angemeldet." />
  }

  const [inboxResult, tasksResult, informationResult] = await Promise.all([
    listInboxItemsForCurrentUser(),
    listTasksForCurrentUser(),
    listInformationItemsForCurrentUser(),
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
