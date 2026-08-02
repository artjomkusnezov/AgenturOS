import { buildCaseTypeLookup } from '@/features/cases/lib/case-display'
import {
  listActiveBusinessAreasForCurrentAgency,
  listActiveCaseTypesForCurrentUser,
} from '@/features/cases/repositories/cases-repository'
import { listCasesForWorkspaceViewFilters } from '@/features/cases/repositories/list-cases-for-workspace-view'
import { computeNavigationBadgeCounts } from '@/features/navigation/lib/compute-navigation-badge-counts'
import type { NavigationBadgeCounts } from '@/features/navigation/types/navigation-badges'
import { countUnprocessedInboxItemsForCurrentUser } from '@/features/inbox/repositories/inbox-repository'

type RepositoryError = {
  success: false
  error: string
}

type NavigationBadgeCountsResult =
  | { success: true; counts: NavigationBadgeCounts }
  | RepositoryError

export async function getNavigationBadgeCountsForCurrentUser(
  currentUserId: string,
): Promise<NavigationBadgeCountsResult> {
  const [
    inboxCountResult,
    openCasesResult,
    caseTypesResult,
    businessAreasResult,
  ] = await Promise.all([
    countUnprocessedInboxItemsForCurrentUser(),
    listCasesForWorkspaceViewFilters({
      filters: {
        core_statuses: ['open', 'in_progress', 'waiting'],
      },
      sort: 'updated_at_desc',
    }),
    listActiveCaseTypesForCurrentUser(),
    listActiveBusinessAreasForCurrentAgency(),
  ])

  if (!inboxCountResult.success) {
    return inboxCountResult
  }

  if (!openCasesResult.success) {
    return openCasesResult
  }

  if (!caseTypesResult.success) {
    return caseTypesResult
  }

  if (!businessAreasResult.success) {
    return businessAreasResult
  }

  const caseTypesById = buildCaseTypeLookup(caseTypesResult.caseTypes)
  const businessAreaKeyById = Object.fromEntries(
    businessAreasResult.businessAreas.map((area) => [area.id, area.key]),
  )

  const counts = computeNavigationBadgeCounts({
    openCases: openCasesResult.cases,
    caseTypesById,
    businessAreaKeyById,
    currentUserId,
  })

  return {
    success: true,
    counts: {
      ...counts,
      inboxUnprocessed: inboxCountResult.count,
    },
  }
}
