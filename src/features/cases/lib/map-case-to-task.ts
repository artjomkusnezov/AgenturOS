import type { CaseRecord } from '@/features/cases/types/case'
import type { Task } from '@/features/tasks/types/task'

/**
 * Maps a mirrored task-case to the Task DTO expected by the existing workspace UI.
 * `id` MUST be `source_task_id` so URLs, writers, and relation loads stay task-keyed.
 */
export function mapCaseRecordToTask(caseRow: CaseRecord): Task {
  if (!caseRow.source_task_id) {
    throw new Error('Case ohne source_task_id kann nicht als Aufgabe abgebildet werden.')
  }

  return {
    id: caseRow.source_task_id,
    user_id: caseRow.created_by,
    agency_id: caseRow.agency_id,
    created_by: caseRow.created_by,
    assignee_user_id: caseRow.assignee_user_id,
    title: caseRow.title,
    description: caseRow.description,
    priority: caseRow.priority,
    due_date: caseRow.due_at,
    completed_at: caseRow.completed_at,
    created_at: caseRow.created_at,
    updated_at: caseRow.updated_at,
  }
}
