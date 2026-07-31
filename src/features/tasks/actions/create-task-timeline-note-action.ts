'use server'

import { revalidatePath } from 'next/cache'

import { createTimelineNote } from '@/features/tasks/repositories/task-timeline-repository'
import {
  hasTaskTimelineNoteFieldErrors,
  validateTaskTimelineNoteInput,
} from '@/features/tasks/lib/validate-task-timeline-note'
import type { TaskTimelineNoteFieldErrors } from '@/features/tasks/types/task-timeline'

export type TaskTimelineNoteMutationState = {
  fieldErrors?: TaskTimelineNoteFieldErrors
  error?: string
  success?: boolean
}

export async function createTaskTimelineNoteAction(
  _prevState: TaskTimelineNoteMutationState,
  formData: FormData,
): Promise<TaskTimelineNoteMutationState> {
  const input = {
    taskId: String(formData.get('taskId') ?? ''),
    content: String(formData.get('content') ?? ''),
  }

  const fieldErrors = validateTaskTimelineNoteInput(input)

  if (hasTaskTimelineNoteFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createTimelineNote(input)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')
  revalidatePath('/app/activity')

  return { success: true }
}
