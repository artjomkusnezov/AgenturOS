'use server'

import { revalidatePath } from 'next/cache'

import { createTaskCaseForCurrentUser } from '@/features/cases/services/case-task-service'
import { isTaskPriority } from '@/features/tasks/lib/task-priority'
import {
  hasTaskFieldErrors,
  normalizeTaskDescription,
  normalizeTaskDueDate,
  parseTaskCreateFormData,
  validateTaskCreateInput,
} from '@/features/tasks/lib/validate-task'
import type { TaskMutationState } from '@/features/tasks/types/task'

export async function createTaskAction(
  _prevState: TaskMutationState,
  formData: FormData
): Promise<TaskMutationState> {
  const input = parseTaskCreateFormData(formData)
  const fieldErrors = validateTaskCreateInput(input)

  if (hasTaskFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const caseIdRaw = String(formData.get('caseId') ?? '').trim()
  const caseId = caseIdRaw.length > 0 ? caseIdRaw : null

  const priority =
    input.priority && isTaskPriority(input.priority) ? input.priority : undefined

  const result = await createTaskCaseForCurrentUser({
    title: input.title.trim(),
    description: normalizeTaskDescription(input.description),
    caseId,
    assigneeUserId: input.assigneeUserId,
    priority,
    dueDate: normalizeTaskDueDate(input.dueDate ?? ''),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')
  revalidatePath('/app/activity')
  revalidatePath('/app/cases')
  revalidatePath('/app')

  return {
    success: true,
    taskId: result.task.id,
  }
}
