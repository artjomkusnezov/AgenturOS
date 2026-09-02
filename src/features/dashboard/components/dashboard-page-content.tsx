import { listCurrentAgencyMembers } from '@/features/agency/repositories/agency-repository'
import {
  buildCaseTypeLookup,
} from '@/features/cases/lib/case-display'
import { listActiveCaseTypesForCurrentUser } from '@/features/cases/repositories/cases-repository'
import { listCasesForWorkspaceViewFilters } from '@/features/cases/repositories/list-cases-for-workspace-view'
import { DashboardErrorBanner } from '@/features/dashboard/components/dashboard-error-banner'
import {
  DashboardWorkOverview,
  type DashboardWorkOverviewProps,
} from '@/features/dashboard/components/dashboard-work-overview'
import {
  countAttentionCases,
  countOverdueAttentionCases,
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

type DashboardLoadResult =
  | { status: 'ok'; props: DashboardWorkOverviewProps }
  | { status: 'error'; message: string }

async function loadDashboardOverview(): Promise<DashboardLoadResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { status: 'error', message: 'Sie sind nicht angemeldet.' }
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
    return { status: 'error', message: inboxResult.error }
  }

  if (!openCasesResult.success) {
    return { status: 'error', message: openCasesResult.error }
  }

  if (!caseTypesResult.success) {
    return { status: 'error', message: caseTypesResult.error }
  }

  const caseTypesById = buildCaseTypeLookup(caseTypesResult.caseTypes)
  const openCases = Array.isArray(openCasesResult.cases) ? openCasesResult.cases : []
  const members = membersResult.success && Array.isArray(membersResult.members)
    ? membersResult.members
    : []
  const memberNameMap = membersResult.success
    ? buildMemberNameMap(membersResult.members)
    : {}

  const attentionItems = selectAttentionCasesForDashboard(openCases, caseTypesById, {
    memberNameMap,
  })
  const attentionCount = countAttentionCases(openCases)
  const overdueAttentionCount = countOverdueAttentionCases(openCases)
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

  const unprocessedInboxItems = Array.isArray(inboxResult.unprocessedItems)
    ? inboxResult.unprocessedItems
    : []

  return {
    status: 'ok',
    props: {
      user: {
        id: user.id,
        user_metadata: user.user_metadata as Record<string, unknown> | undefined,
      },
      members,
      unprocessedInboxItems,
      attentionItems,
      attentionCount,
      overdueAttentionCount,
      myTasks,
      myOpenTaskCount,
      teamTasks,
      caseTypeCounts,
      recentlyUpdated,
      memberNameMap,
    },
  }
}

export async function DashboardPageContent() {
  let loadResult: DashboardLoadResult

  try {
    loadResult = await loadDashboardOverview()
  } catch {
    loadResult = {
      status: 'error',
      message: 'Das Dashboard konnte nicht geladen werden. Bitte laden Sie die Seite neu.',
    }
  }

  if (loadResult.status === 'error') {
    return <DashboardErrorBanner message={loadResult.message} />
  }

  return <DashboardWorkOverview {...loadResult.props} />
}
