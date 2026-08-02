import type { Tables } from '@/lib/supabase/types'
import type { FileRecord } from '@/features/files/types/file'

export type CaseTimelineEntry = Tables<'case_timeline_entries'>

export type CaseTimelineEventType =
  | 'created'
  | 'note'
  | 'attachment'
  | 'task_created'
  | 'task_completed'
  | 'status_changed'
  | 'assignee_changed'
  | 'priority_changed'
  | 'due_at_changed'

export type CaseTimelineEntryView = CaseTimelineEntry & {
  file: FileRecord | null
  mediaUrl: string | null
}

export type CreateCaseTimelineNoteInput = {
  caseId: string
  content: string
}

export type CaseTimelineNoteFieldErrors = {
  caseId?: string
  content?: string
}

export type AttachCaseFileInput = {
  caseId: string
  fileId: string
}

export type CaseTimelineAttachmentFieldErrors = {
  caseId?: string
  fileId?: string
  file?: string
}
