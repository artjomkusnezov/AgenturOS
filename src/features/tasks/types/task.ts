import type { Tables } from '@/lib/supabase/types'

export type Task = Tables<'tasks'>

/** Agentur-Zusammenarbeit: agency_id, created_by, assignee_user_id sind auf Task enthalten. */
export type TaskCollaborationFields = Pick<
  Task,
  'agency_id' | 'created_by' | 'assignee_user_id'
>

export type TaskPriority = Task['priority']

export type TaskFieldErrors = {
  title?: string
  description?: string
  priority?: string
  dueDate?: string
  assigneeUserId?: string
}

export type TaskMutationState = {
  fieldErrors?: TaskFieldErrors
  error?: string
  success?: boolean
  taskId?: string
}

export type TaskInput = {
  title: string
  description: string
}

export type TaskDetailInput = {
  title: string
  description: string
  priority: string
  dueDate: string
}
