'use server'

import { revalidatePath } from 'next/cache'

import { updateTaskCaseAssigneeForCurrentUser } from '@/features/cases/services/case-task-service'
import {
  parseTaskAssigneeFormData,
  validateTaskAssigneeInput,
} from '@/features/tasks/lib/validate-task-assignee'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function updateTaskAssigneeAction(
  _prevState: TaskMutationState,
  formData: FormData,
): Promise<TaskMutationState> {
  const input = parseTaskAssigneeFormData(formData)
  const validationError = validateTaskAssigneeInput(input)

  if (validationError) {
    return { error: validationError }
  }

  const result = await updateTaskCaseAssigneeForCurrentUser(input.taskId, input.assigneeUserId)

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
