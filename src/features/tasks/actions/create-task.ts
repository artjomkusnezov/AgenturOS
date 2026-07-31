'use server'

import { revalidatePath } from 'next/cache'

import {
  createTaskForCurrentUser,
} from '@/features/tasks/repositories/tasks-repository'
import {
  hasTaskFieldErrors,
  normalizeTaskDescription,
  parseTaskFormData,
  validateTaskInput,
} from '@/features/tasks/lib/validate-task'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function createTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const input = parseTaskFormData(formData)
  const fieldErrors = validateTaskInput(input)

  if (hasTaskFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createTaskForCurrentUser({
    title: input.title.trim(),
    description: normalizeTaskDescription(input.description),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')
  revalidatePath('/app/activity')

  return {
    success: true,
    taskId: result.task.id,
  }
}
