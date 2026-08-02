import type { DirectCaseTypeKey } from '@/features/cases/lib/validate-create-case'
import type { CasePriority, SystemCaseTypeKey } from '@/features/cases/types/case'
import { isSystemCaseTypeKey } from '@/features/cases/types/case'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type CreateCaseResult =
  | {
      success: true
      caseId: string
      caseTypeKey: SystemCaseTypeKey
    }
  | RepositoryError

export type CreateCaseInput = {
  caseTypeKey: DirectCaseTypeKey
  title: string
  description: string | null
  assigneeUserId: string
  priority: CasePriority
  dueAt: string | null
  businessAreaKey?: string
}

function mapCreateCaseError(message: string, fallback: string): string {
  if (message.includes('not authenticated')) {
    return 'Sie sind nicht angemeldet.'
  }
  if (message.includes('due_at required for follow_up')) {
    return 'Für Wiedervorlagen ist ein Datum erforderlich.'
  }
  if (message.includes('assignee not active agency member')) {
    return 'Der gewählte Verantwortliche gehört nicht zur Agentur.'
  }
  if (message.includes('business area not found')) {
    return 'Der gewählte Fachbereich wurde nicht gefunden.'
  }
  if (message.includes('invalid case type') || message.includes('case type required')) {
    return 'Der Vorgangstyp ist ungültig.'
  }
  if (message.includes('invalid priority')) {
    return 'Die Priorität ist ungültig.'
  }
  if (message.includes('title empty')) {
    return 'Bitte geben Sie einen Titel an.'
  }
  if (
    message.includes('no active agency membership')
    || message.includes('ambiguous active agency membership')
  ) {
    return 'Die Agenturmitgliedschaft konnte nicht ermittelt werden.'
  }

  return fallback
}

export async function createCaseForCurrentUser(
  input: CreateCaseInput,
): Promise<CreateCaseResult> {
  if (input.caseTypeKey === 'follow_up' && !input.dueAt) {
    return {
      success: false,
      error: 'Für Wiedervorlagen ist ein Datum erforderlich.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_case', {
    p_case_type_key: input.caseTypeKey,
    p_title: input.title,
    p_description: input.description ?? undefined,
    p_business_area_key: input.businessAreaKey ?? 'general',
    p_assignee_user_id: input.assigneeUserId,
    p_due_at: input.dueAt ?? undefined,
    p_priority: input.priority,
  })

  if (error || !data || data.length === 0) {
    return {
      success: false,
      error: mapCreateCaseError(
        error?.message ?? '',
        'Der Vorgang konnte nicht erstellt werden.',
      ),
    }
  }

  const row = data[0]
  const caseTypeKey = isSystemCaseTypeKey(row.case_type_key)
    ? row.case_type_key
    : input.caseTypeKey

  return {
    success: true,
    caseId: row.case_id,
    caseTypeKey,
  }
}
