import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import {
  hasTaskTimelineNoteFieldErrors,
  normalizeTaskTimelineNoteContent,
  validateTaskTimelineNoteInput,
} from '@/features/tasks/lib/validate-task-timeline-note'
import type {
  CreateTaskTimelineNoteInput,
  TaskTimelineEntry,
} from '@/features/tasks/types/task-timeline'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTimelineResult =
  | { success: true; entries: TaskTimelineEntry[] }
  | RepositoryError

type TimelineEntryResult =
  | { success: true; entry: TaskTimelineEntry }
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

export async function listTimelineForTask(
  taskId: string,
): Promise<ListTimelineResult> {
  if (!isValidTaskId(taskId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Aufgaben-ID an.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_timeline_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die Arbeitschronik konnte nicht geladen werden.',
    }
  }

  return {
    success: true,
    entries: data,
  }
}

export async function createTimelineNote(
  input: CreateTaskTimelineNoteInput,
): Promise<TimelineEntryResult> {
  const validationErrors = validateTaskTimelineNoteInput(input)

  if (hasTaskTimelineNoteFieldErrors(validationErrors)) {
    return {
      success: false,
      error:
        validationErrors.content ??
        validationErrors.taskId ??
        'Die Chroniknotiz ist ungültig.',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_timeline_entries')
    .insert({
      task_id: input.taskId,
      entry_type: 'note',
      event_key: null,
      author_user_id: authResult.userId,
      content: normalizeTaskTimelineNoteContent(input.content),
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Chroniknotiz konnte nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    entry: data,
  }
}
