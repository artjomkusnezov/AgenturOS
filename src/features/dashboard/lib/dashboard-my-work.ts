import {
  resolveCaseTypeKey,
  resolveCaseTypeLabel,
  type CaseTypeLookup,
} from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import { buildDashboardCaseHref } from '@/features/dashboard/lib/dashboard-case-href'
import { formatDashboardDateOrTime } from '@/features/dashboard/lib/dashboard-format'

export type DashboardMyWorkCaseItem = {
  caseId: string
  title: string
  typeLabel: string
  typeKey: string | null
  href: string
  updatedAt: string
  updatedLabel: string
  dueAt: string | null
}

export type DashboardCaseTypeCount = {
  typeKey: string
  typeLabel: string
  count: number
}

type SelectMyWorkOptions = {
  currentUserId: string
  excludeCaseIds?: ReadonlySet<string>
  recentLimit?: number
}

function toMyWorkItem(
  caseRow: CaseRecord,
  caseTypesById: Record<string, CaseTypeLookup>,
): DashboardMyWorkCaseItem {
  const typeKey = resolveCaseTypeKey(caseRow.case_type_id, caseTypesById)
  const typeLabel = resolveCaseTypeLabel(caseRow.case_type_id, caseTypesById)

  return {
    caseId: caseRow.id,
    title: caseRow.title.trim() || typeLabel,
    typeLabel,
    typeKey,
    href: buildDashboardCaseHref(caseRow, typeKey),
    updatedAt: caseRow.updated_at,
    updatedLabel: formatDashboardDateOrTime(caseRow.updated_at),
    dueAt: caseRow.due_at,
  }
}

function isAssignedToUser(caseRow: CaseRecord, userId: string): boolean {
  return caseRow.assignee_user_id === userId
}

function isTaskType(
  caseRow: CaseRecord,
  caseTypesById: Record<string, CaseTypeLookup>,
): boolean {
  return resolveCaseTypeKey(caseRow.case_type_id, caseTypesById) === 'task'
}

/**
 * Gruppiert offene Vorgänge des Users nach Typ (ohne Aufgaben-Cases).
 */
export function groupMyOpenCasesByType(
  cases: DashboardMyWorkCaseItem[],
): DashboardCaseTypeCount[] {
  const counts = new Map<string, DashboardCaseTypeCount>()

  for (const item of cases) {
    const key = item.typeKey ?? 'general'
    const existing = counts.get(key)

    if (existing) {
      existing.count += 1
      continue
    }

    counts.set(key, {
      typeKey: key,
      typeLabel: item.typeLabel,
      count: 1,
    })
  }

  return Array.from(counts.values()).sort((a, b) =>
    a.typeLabel.localeCompare(b.typeLabel, 'de'),
  )
}

/**
 * „Meine Arbeit“: Vorgangsüberblick ohne Aufgaben (die leben in Meine/Team-Aufgaben).
 */
export function selectMyWorkForDashboard(
  openCases: CaseRecord[],
  caseTypesById: Record<string, CaseTypeLookup>,
  options: SelectMyWorkOptions,
): {
  myOpenCaseItems: DashboardMyWorkCaseItem[]
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
} {
  const excludeCaseIds = options.excludeCaseIds ?? new Set<string>()
  const recentLimit = options.recentLimit ?? 3
  const userId = options.currentUserId

  const myCases = openCases
    .filter(
      (caseRow) =>
        !excludeCaseIds.has(caseRow.id) &&
        isAssignedToUser(caseRow, userId) &&
        !isTaskType(caseRow, caseTypesById),
    )
    .map((caseRow) => toMyWorkItem(caseRow, caseTypesById))

  const caseTypeCounts = groupMyOpenCasesByType(myCases)

  const recentlyUpdated = [...myCases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, recentLimit)

  return {
    myOpenCaseItems: myCases,
    caseTypeCounts,
    recentlyUpdated,
  }
}
