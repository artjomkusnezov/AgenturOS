'use server'

import { revalidatePath } from 'next/cache'

import { attachFileToTask } from '@/features/tasks/repositories/task-relations-repository'
import type { TaskRelationMutationState } from '@/features/tasks/types/task-relation'

export async function attachTaskFileAction(
  _prevState: TaskRelationMutationState,
  formData: FormData,
): Promise<TaskRelationMutationState> {
  const taskId = String(formData.get('taskId') ?? '')
  const fileId = String(formData.get('fileId') ?? '')

  const result = await attachFileToTask(taskId, fileId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')

  return { success: true }
}
