import type { Tables } from '@/lib/supabase/types'

export type TaskTimelineEntry = Tables<'task_timeline_entries'>

export type TaskTimelineEntryType = TaskTimelineEntry['entry_type']

export type CreateTaskTimelineNoteInput = {
  taskId: string
  content: string
}

export type TaskTimelineNoteFieldErrors = {
  taskId?: string
  content?: string
}
