import { listTaskActivityForCurrentUser } from '@/features/activity/repositories/task-activity-repository'
import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import {
  buildCaseTypeLookup,
} from '@/features/cases/lib/case-display'
import { listActiveCaseTypesForCurrentUser } from '@/features/cases/repositories/cases-repository'
import { listCasesForWorkspaceViewFilters } from '@/features/cases/repositories/list-cases-for-workspace-view'
import { DashboardErrorBanner } from '@/features/dashboard/components/dashboard-error-banner'
import { DashboardWorkOverview } from '@/features/dashboard/components/dashboard-work-overview'
import {
  countAttentionCases,
  selectAttentionCasesForDashboard,
} from '@/features/dashboard/lib/dashboard-attention'
import { selectMyWorkForDashboard } from '@/features/dashboard/lib/dashboard-my-work'
import { listInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import { buildMemberNameMap } from '@/features/tasks/lib/resolve-task-member-name'
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

  const [
    inboxResult,
    membersResult,
    activityResult,
    openCasesResult,
    caseTypesResult,
  ] = await Promise.all([
    listInboxItemsForCurrentUser(),
    listCurrentAgencyMembers(),
    listTaskActivityForCurrentUser({ limit: 3 }),
    listCasesForWorkspaceViewFilters({
      filters: {
        core_statuses: ['open', 'in_progress', 'waiting'],
      },
      sort: 'updated_at_desc',
    }),
    listActiveCaseTypesForCurrentUser(),
  ])

  if (!inboxResult.success) {
    return <DashboardErrorBanner message={inboxResult.error} />
  }

  if (!openCasesResult.success) {
    return <DashboardErrorBanner message={openCasesResult.error} />
  }

  if (!caseTypesResult.success) {
    return <DashboardErrorBanner message={caseTypesResult.error} />
  }

  const caseTypesById = buildCaseTypeLookup(caseTypesResult.caseTypes)
  const openCases = openCasesResult.cases

  const attentionItems = selectAttentionCasesForDashboard(openCases, caseTypesById)
  const attentionCount = countAttentionCases(openCases)
  const attentionCaseIds = new Set(attentionItems.map((item) => item.caseId))

  const { myOpenCases, myOpenTasks, recentlyUpdated } = selectMyWorkForDashboard(
    openCases,
    caseTypesById,
    {
      currentUserId: user.id,
      excludeCaseIds: attentionCaseIds,
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
      attentionItems={attentionItems}
      attentionCount={attentionCount}
      myOpenCases={myOpenCases}
      myOpenTasks={myOpenTasks}
      recentlyUpdated={recentlyUpdated}
      activityItems={activityItems}
      memberNameMap={memberNameMap}
    />
  )
}
