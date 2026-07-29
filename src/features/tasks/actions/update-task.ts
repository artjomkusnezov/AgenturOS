'use server'

import { revalidatePath } from 'next/cache'

import {
  updateTaskDetailsForCurrentUser,
} from '@/features/tasks/repositories/tasks-repository'
import {
  hasTaskFieldErrors,
  isValidTaskId,
  normalizeTaskDescription,
  normalizeTaskDueDate,
  parseTaskDetailFormData,
  validateTaskDetailInput,
} from '@/features/tasks/lib/validate-task'
import { isTaskPriority } from '@/features/tasks/lib/task-priority'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function updateTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const taskId = String(formData.get('taskId') ?? '')

  if (!isValidTaskId(taskId)) {
    return { error: 'Die Aufgabe ist ungültig.' }
  }

  const input = parseTaskDetailFormData(formData)
  const fieldErrors = validateTaskDetailInput(input)

  if (hasTaskFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  if (!isTaskPriority(input.priority)) {
    return { error: 'Die Priorität ist ungültig.' }
  }

  const result = await updateTaskDetailsForCurrentUser(taskId, {
    title: input.title.trim(),
    description: normalizeTaskDescription(input.description),
    priority: input.priority,
    due_date: normalizeTaskDueDate(input.dueDate),
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
