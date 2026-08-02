'use server'

import { revalidatePath } from 'next/cache'

import { deleteTaskCaseForCurrentUser } from '@/features/cases/services/case-task-service'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function deleteTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const taskId = String(formData.get('taskId') ?? '')

  if (!isValidTaskId(taskId)) {
    return { error: 'Die Aufgabe ist ungültig.' }
  }

  const result = await deleteTaskCaseForCurrentUser(taskId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')

  return {
    success: true,
  }
}
