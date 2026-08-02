import {
  hasCaseTimelineNoteFieldErrors,
  isValidCaseId,
  normalizeCaseTimelineNoteContent,
  validateCaseTimelineNoteInput,
} from '@/features/cases/lib/validate-case-timeline-note'
import type {
  CreateCaseTimelineNoteInput,
  CaseTimelineEntry,
} from '@/features/cases/types/case-timeline'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTimelineResult =
  | { success: true; entries: CaseTimelineEntry[] }
  | RepositoryError

type TimelineEntryResult =
  | { success: true; entry: CaseTimelineEntry }
  | RepositoryError

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

export async function listTimelineForCase(
  caseId: string,
): Promise<ListTimelineResult> {
  if (!isValidCaseId(caseId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Vorgangs-ID an.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_timeline_entries')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Der Vorgangsverlauf konnte nicht geladen werden.',
    }
  }

  return {
    success: true,
    entries: data,
  }
}

export async function createCaseTimelineNote(
  input: CreateCaseTimelineNoteInput,
): Promise<TimelineEntryResult> {
  const validationErrors = validateCaseTimelineNoteInput(input)

  if (hasCaseTimelineNoteFieldErrors(validationErrors)) {
    return {
      success: false,
      error:
        validationErrors.content ??
        validationErrors.caseId ??
        'Die Verlaufsnotiz ist ungültig.',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, agency_id')
    .eq('id', input.caseId)
    .maybeSingle()

  if (caseError) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht geladen werden.',
    }
  }

  if (!caseRow) {
    return {
      success: false,
      error: 'Der Vorgang wurde nicht gefunden.',
    }
  }

  const { data, error } = await supabase
    .from('case_timeline_entries')
    .insert({
      case_id: input.caseId,
      agency_id: caseRow.agency_id,
      created_by: authResult.userId,
      event_type: 'note',
      content: normalizeCaseTimelineNoteContent(input.content),
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Verlaufsnotiz konnte nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    entry: data,
  }
}
