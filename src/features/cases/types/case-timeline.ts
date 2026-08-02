import type { Tables } from '@/lib/supabase/types'

export type CaseTimelineEntry = Tables<'case_timeline_entries'>

export type CaseTimelineEventType = 'created' | 'note'

export type CreateCaseTimelineNoteInput = {
  caseId: string
  content: string
}

export type CaseTimelineNoteFieldErrors = {
  caseId?: string
  content?: string
}
