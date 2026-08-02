'use server'

import { revalidatePath } from 'next/cache'

import { createTaskCaseForCurrentUser } from '@/features/cases/services/case-task-service'
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

  const caseIdRaw = String(formData.get('caseId') ?? '').trim()
  const caseId = caseIdRaw.length > 0 ? caseIdRaw : null

  const result = await createTaskCaseForCurrentUser({
    title: input.title.trim(),
    description: normalizeTaskDescription(input.description),
    caseId,
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/tasks')
  revalidatePath('/app/activity')
  revalidatePath('/app/cases')

  return {
    success: true,
    taskId: result.task.id,
  }
}
