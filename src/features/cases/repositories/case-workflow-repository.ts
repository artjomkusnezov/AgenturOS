import {
  hasCaseWorkflowFieldErrors,
  validateUpdateCaseInput,
  type CaseUpdateResult,
  type UpdateCaseInput,
} from '@/features/cases/types/case-workflow'
import type { CaseRecord } from '@/features/cases/types/case'
import { createClient } from '@/lib/supabase/server'

function mapUpdateCaseError(message: string): string {
  if (message.includes('not authenticated')) {
    return 'Sie sind nicht angemeldet.'
  }
  if (message.includes('case not found') || message.includes('access denied')) {
    return 'Der Vorgang wurde nicht gefunden oder Sie haben keinen Zugriff.'
  }
  if (message.includes('task cases must be updated')) {
    return 'Aufgaben werden über den Aufgabenbereich bearbeitet.'
  }
  if (message.includes('invalid core status')) {
    return 'Der Status ist ungültig.'
  }
  if (message.includes('assignee not an active agency member')) {
    return 'Der Verantwortliche muss aktives Mitglied Ihrer Agentur sein.'
  }
  if (message.includes('invalid priority')) {
    return 'Die Priorität ist ungültig.'
  }
  if (message.includes('due_at required for follow_up')) {
    return 'Bei einer Wiedervorlage ist ein Fälligkeitsdatum erforderlich.'
  }
  if (message.includes('no case fields to update')) {
    return 'Es wurde keine Änderung angegeben.'
  }
  return 'Der Vorgang konnte nicht gespeichert werden.'
}

export async function updateCaseForCurrentUser(
  input: UpdateCaseInput,
): Promise<CaseUpdateResult> {
  const fieldErrors = validateUpdateCaseInput(input)

  if (hasCaseWorkflowFieldErrors(fieldErrors)) {
    return {
      success: false,
      error:
        fieldErrors.dueAt ??
        fieldErrors.coreStatus ??
        fieldErrors.assigneeUserId ??
        fieldErrors.priority ??
        fieldErrors.caseId ??
        'Die Änderung ist ungültig.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('update_case', {
    p_case_id: input.caseId,
    p_set_core_status: input.coreStatus !== undefined,
    p_core_status: input.coreStatus ?? undefined,
    p_set_assignee: Boolean(input.setAssignee),
    p_assignee_user_id: input.setAssignee ? (input.assigneeUserId ?? null) : undefined,
    p_set_priority: input.priority !== undefined,
    p_priority: input.priority ?? undefined,
    p_set_due_at: Boolean(input.setDueAt),
    p_due_at: input.setDueAt ? (input.dueAt ?? null) : undefined,
  })

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateCaseError(error?.message ?? ''),
    }
  }

  return {
    success: true,
    case: data as CaseRecord,
  }
}
