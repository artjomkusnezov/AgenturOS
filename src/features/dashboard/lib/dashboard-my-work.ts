import {
  resolveCaseTypeKey,
  resolveCaseTypeLabel,
  type CaseTypeLookup,
} from '@/features/cases/lib/case-display'
import { mapCaseRecordToTask } from '@/features/cases/lib/map-case-to-task'
import type { CaseRecord } from '@/features/cases/types/case'
import { buildDashboardCaseHref } from '@/features/dashboard/lib/dashboard-case-href'
import { isTaskOpen } from '@/features/tasks/lib/task-status'
import type { Task } from '@/features/tasks/types/task'

export type DashboardMyWorkCaseItem = {
  caseId: string
  title: string
  typeLabel: string
  typeKey: string | null
  href: string
  updatedAt: string
  dueAt: string | null
}

type SelectMyWorkOptions = {
  currentUserId: string
  /** Case-IDs, die bereits in „Braucht Aufmerksamkeit“ stehen – keine Doppelanzeige. */
  excludeCaseIds?: ReadonlySet<string>
  caseLimit?: number
  taskLimit?: number
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
 * „Meine Arbeit“: offene Vorgänge / Aufgaben des Users + zuletzt bearbeitet.
 * Keine Doppelanzeige mit Attention-Liste.
 */
export function selectMyWorkForDashboard(
  openCases: CaseRecord[],
  caseTypesById: Record<string, CaseTypeLookup>,
  options: SelectMyWorkOptions,
): {
  myOpenCases: DashboardMyWorkCaseItem[]
  myOpenTasks: Task[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
} {
  const excludeCaseIds = options.excludeCaseIds ?? new Set<string>()
  const caseLimit = options.caseLimit ?? 5
  const taskLimit = options.taskLimit ?? 5
  const recentLimit = options.recentLimit ?? 3
  const userId = options.currentUserId

  const available = openCases.filter((caseRow) => !excludeCaseIds.has(caseRow.id))

  const myOpenCases = available
    .filter(
      (caseRow) =>
        isAssignedToUser(caseRow, userId) && !isTaskType(caseRow, caseTypesById),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, caseLimit)
    .map((caseRow) => toMyWorkItem(caseRow, caseTypesById))

  const shownCaseIds = new Set(myOpenCases.map((item) => item.caseId))

  const myOpenTasks = available
    .filter(
      (caseRow) =>
        isAssignedToUser(caseRow, userId) &&
        isTaskType(caseRow, caseTypesById) &&
        Boolean(caseRow.source_task_id),
    )
    .map((caseRow) => mapCaseRecordToTask(caseRow))
    .filter(isTaskOpen)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, taskLimit)

  const shownTaskCaseIds = new Set(
    available
      .filter(
        (caseRow) =>
          caseRow.source_task_id !== null &&
          myOpenTasks.some((task) => task.id === caseRow.source_task_id),
      )
      .map((caseRow) => caseRow.id),
  )

  for (const id of shownTaskCaseIds) {
    shownCaseIds.add(id)
  }

  const recentlyUpdated = available
    .filter((caseRow) => !shownCaseIds.has(caseRow.id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, recentLimit)
    .map((caseRow) => toMyWorkItem(caseRow, caseTypesById))

  return { myOpenCases, myOpenTasks, recentlyUpdated }
}
