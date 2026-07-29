'use server'

import { revalidatePath } from 'next/cache'

import { reopenTaskForCurrentUser } from '@/features/tasks/repositories/tasks-repository'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function reopenTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const taskId = String(formData.get('taskId') ?? '')

  if (!isValidTaskId(taskId)) {
    return { error: 'Die Aufgabe ist ungültig.' }
  }

  const result = await reopenTaskForCurrentUser(taskId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')

  return {
    success: true,
    taskId: result.task.id,
  }
}
