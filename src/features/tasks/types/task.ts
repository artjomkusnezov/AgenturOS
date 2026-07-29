import type { Tables } from '@/lib/supabase/types'

export type Task = Tables<'tasks'>

export type TaskPriority = Task['priority']

export type TaskFieldErrors = {
  title?: string
  description?: string
  priority?: string
  dueDate?: string
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
