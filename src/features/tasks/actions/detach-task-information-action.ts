'use server'

import { revalidatePath } from 'next/cache'

import { detachInformationFromTask } from '@/features/tasks/repositories/task-relations-repository'
import type { TaskRelationMutationState } from '@/features/tasks/types/task-relation'

export async function detachTaskInformationAction(
  _prevState: TaskRelationMutationState,
  formData: FormData,
): Promise<TaskRelationMutationState> {
  const taskId = String(formData.get('taskId') ?? '')
  const informationId = String(formData.get('informationId') ?? '')

  const result = await detachInformationFromTask(taskId, informationId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')

  return { success: true }
}
