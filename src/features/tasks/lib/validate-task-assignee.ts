import { isValidTaskId } from '@/features/tasks/lib/validate-task'

export type TaskAssigneeInput = {
  taskId: string
  assigneeUserId: string | null
}

export function parseTaskAssigneeFormData(formData: FormData): TaskAssigneeInput {
  const taskId = String(formData.get('taskId') ?? '')
  const rawAssigneeUserId = String(formData.get('assigneeUserId') ?? '').trim()

  return {
    taskId,
    assigneeUserId: rawAssigneeUserId.length > 0 ? rawAssigneeUserId : null,
  }
}

export function validateTaskAssigneeInput(input: TaskAssigneeInput): string | null {
  if (!isValidTaskId(input.taskId)) {
    return 'Die Aufgabe ist ungültig.'
  }

  if (input.assigneeUserId !== null && !isValidTaskId(input.assigneeUserId)) {
    return 'Die Verantwortlichkeit ist ungültig.'
  }

  return null
}
