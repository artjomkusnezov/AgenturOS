import {
  isCaseOpenForDue,
  resolveCaseTypeKey,
  type CaseTypeLookup,
} from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import {
  classifyAttentionBucket,
  countAttentionCases,
} from '@/features/dashboard/lib/dashboard-attention'
import {
  buildOpenTaskItemsFromCases,
  countMyOpenTasks,
} from '@/features/dashboard/lib/dashboard-tasks'
import type { NavigationBadgeCounts } from '@/features/navigation/types/navigation-badges'
import { getTodayDateString } from '@/features/tasks/lib/task-status'

function countOpenCasesByTypeKey(
  cases: CaseRecord[],
  caseTypesById: Record<string, CaseTypeLookup>,
  typeKey: string,
): number {
  return cases.filter((caseRow) => {
    if (!isCaseOpenForDue(caseRow)) {
      return false
    }

    return resolveCaseTypeKey(caseRow.case_type_id, caseTypesById) === typeKey
  }).length
}

function countOpenCasesByBusinessAreaKey(
  cases: CaseRecord[],
  businessAreaKeyById: Record<string, string>,
  businessAreaKey: string,
): number {
  return cases.filter((caseRow) => {
    if (!isCaseOpenForDue(caseRow)) {
      return false
    }

    if (!caseRow.business_area_id) {
      return false
    }

    return businessAreaKeyById[caseRow.business_area_id] === businessAreaKey
  }).length
}

function countDueFollowUpCases(
  cases: CaseRecord[],
  caseTypesById: Record<string, CaseTypeLookup>,
  today: string,
): number {
  return cases.filter((caseRow) => {
    if (resolveCaseTypeKey(caseRow.case_type_id, caseTypesById) !== 'follow_up') {
      return false
    }

    const bucket = classifyAttentionBucket(caseRow, today)
    return bucket === 'overdue' || bucket === 'today' || bucket === 'soon'
  }).length
}

function countOverdueAttentionCases(
  cases: CaseRecord[],
  today: string,
): number {
  return cases.filter(
    (caseRow) => classifyAttentionBucket(caseRow, today) === 'overdue',
  ).length
}

export function computeNavigationBadgeCounts(input: {
  openCases: CaseRecord[]
  caseTypesById: Record<string, CaseTypeLookup>
  businessAreaKeyById: Record<string, string>
  currentUserId: string
  today?: string
}): NavigationBadgeCounts {
  const today = input.today ?? getTodayDateString()
  const openTaskItems = buildOpenTaskItemsFromCases(
    input.openCases,
    input.caseTypesById,
  )

  return {
    inboxUnprocessed: 0,
    casesAttention: countAttentionCases(input.openCases, today),
    casesAttentionOverdue: countOverdueAttentionCases(input.openCases, today),
    caseViewCounts: {
      tasks: countMyOpenTasks(openTaskItems, input.currentUserId),
      offers: countOpenCasesByTypeKey(input.openCases, input.caseTypesById, 'offer'),
      claims: countOpenCasesByTypeKey(input.openCases, input.caseTypesById, 'claim'),
      'follow-ups': countDueFollowUpCases(
        input.openCases,
        input.caseTypesById,
        today,
      ),
      mortgage: countOpenCasesByBusinessAreaKey(
        input.openCases,
        input.businessAreaKeyById,
        'mortgage',
      ),
    },
  }
}
