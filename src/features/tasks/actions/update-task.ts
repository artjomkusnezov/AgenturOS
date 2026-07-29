'use server'

import { revalidatePath } from 'next/cache'

import {
  updateTaskForCurrentUser,
} from '@/features/tasks/repositories/tasks-repository'
import {
  hasTaskFieldErrors,
  isValidTaskId,
  normalizeTaskDescription,
  parseTaskFormData,
  validateTaskInput,
} from '@/features/tasks/lib/validate-task'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function updateTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const taskId = String(formData.get('taskId') ?? '')

  if (!isValidTaskId(taskId)) {
    return { error: 'Die Aufgabe ist ungültig.' }
  }

  const input = parseTaskFormData(formData)
  const fieldErrors = validateTaskInput(input)

  if (hasTaskFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await updateTaskForCurrentUser(taskId, {
    title: input.title.trim(),
    description: normalizeTaskDescription(input.description),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')

  return {
    success: true,
    taskId: result.task.id,
  }
}
