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
import {
  buildOpenTaskItemsFromCases,
  countMyOpenTasks,
  selectMyTasksForDashboard,
  selectTeamTasksForDashboard,
} from '@/features/dashboard/lib/dashboard-tasks'
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
    openCasesResult,
    caseTypesResult,
  ] = await Promise.all([
    listInboxItemsForCurrentUser(),
    listCurrentAgencyMembers(),
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
  const members = membersResult.success ? membersResult.members : []
  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  const attentionItems = selectAttentionCasesForDashboard(openCases, caseTypesById, {
    memberNameMap,
  })
  const attentionCount = countAttentionCases(openCases)
  const attentionCaseIds = new Set(attentionItems.map((item) => item.caseId))

  const openTaskItems = buildOpenTaskItemsFromCases(openCases, caseTypesById)
  const myTasks = selectMyTasksForDashboard(openTaskItems, user.id)
  const myOpenTaskCount = countMyOpenTasks(openTaskItems, user.id)
  const teamTasks = selectTeamTasksForDashboard(openTaskItems, members, user.id)

  const { caseTypeCounts, recentlyUpdated } = selectMyWorkForDashboard(
    openCases,
    caseTypesById,
    {
      currentUserId: user.id,
      excludeCaseIds: attentionCaseIds,
    },
  )

  return (
    <DashboardWorkOverview
      user={user}
      unprocessedInboxItems={inboxResult.unprocessedItems}
      attentionItems={attentionItems}
      attentionCount={attentionCount}
      myTasks={myTasks}
      myOpenTaskCount={myOpenTaskCount}
      teamTasks={teamTasks}
      caseTypeCounts={caseTypeCounts}
      recentlyUpdated={recentlyUpdated}
      memberNameMap={memberNameMap}
    />
  )
}
