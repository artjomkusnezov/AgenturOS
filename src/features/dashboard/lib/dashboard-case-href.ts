import { buildCasesItemHref } from '@/features/cases/lib/cases-workspace-urls'
import { isSystemCaseTypeKey, type CaseRecord } from '@/features/cases/types/case'
import { resolvePromotionViewKey } from '@/features/cases/types/inbox-promotion'

/**
 * Deep-Link für Dashboard-Zeilen: Task-Cases → Aufgaben-Workspace,
 * alle anderen → Cases-View zum Typ.
 */
export function buildDashboardCaseHref(
  caseRow: CaseRecord,
  typeKey: string | null,
): string {
  if (typeKey === 'task' && caseRow.source_task_id) {
    return buildCasesItemHref('tasks', 'tasks', { taskId: caseRow.source_task_id })
  }

  if (typeKey && isSystemCaseTypeKey(typeKey)) {
    return buildCasesItemHref('cases', resolvePromotionViewKey(typeKey), {
      caseId: caseRow.id,
    })
  }

  return buildCasesItemHref('cases', 'cases', { caseId: caseRow.id })
}
