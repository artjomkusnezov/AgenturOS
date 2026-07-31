'use server'

import { revalidatePath } from 'next/cache'

import { completeTaskForCurrentUser } from '@/features/tasks/repositories/tasks-repository'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function completeTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const taskId = String(formData.get('taskId') ?? '')

  if (!isValidTaskId(taskId)) {
    return { error: 'Die Aufgabe ist ungültig.' }
  }

  const result = await completeTaskForCurrentUser(taskId)

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
