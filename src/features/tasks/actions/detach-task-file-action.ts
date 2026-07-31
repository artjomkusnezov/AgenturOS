'use server'

import { revalidatePath } from 'next/cache'

import { detachFileFromTask } from '@/features/tasks/repositories/task-relations-repository'
import type { TaskRelationMutationState } from '@/features/tasks/types/task-relation'

export async function detachTaskFileAction(
  _prevState: TaskRelationMutationState,
  formData: FormData,
): Promise<TaskRelationMutationState> {
  const taskId = String(formData.get('taskId') ?? '')
  const fileId = String(formData.get('fileId') ?? '')

  const result = await detachFileFromTask(taskId, fileId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')

  return { success: true }
}
