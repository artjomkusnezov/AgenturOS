import { partitionAndSortTasks } from '@/features/tasks/lib/sort-tasks'
import type { Task, TaskPriority } from '@/features/tasks/types/task'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTasksResult =
  | { success: true; openTasks: Task[]; completedTasks: Task[] }
  | RepositoryError

type TaskResult =
  | { success: true; task: Task }
  | RepositoryError

type DeleteTaskResult =
  | { success: true }
  | RepositoryError

type TaskWriteInput = {
  title: string
  description: string | null
}

type TaskDetailWriteInput = {
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | null
}

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

export async function listTasksForCurrentUser(): Promise<ListTasksResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('tasks').select('*')

  if (error) {
    return {
      success: false,
      error: 'Die Aufgaben konnten nicht geladen werden.',
    }
  }

  const { openTasks, completedTasks } = partitionAndSortTasks(data)

  return {
    success: true,
    openTasks,
    completedTasks,
  }
}

export async function getTaskForCurrentUser(taskId: string): Promise<TaskResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Aufgabe wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    task: data,
  }
}

export async function createTaskForCurrentUser(
  input: TaskWriteInput
): Promise<TaskResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_task', {
    p_title: input.title,
    p_description: input.description ?? undefined,
  })

  if (error || !data) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht erstellt werden.',
    }
  }

  return {
    success: true,
    task: data as Task,
  }
}

export async function updateTaskDetailsForCurrentUser(
  taskId: string,
  input: TaskDetailWriteInput
): Promise<TaskResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description,
      priority: input.priority,
      due_date: input.due_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht gespeichert werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Aufgabe wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    task: data,
  }
}

export async function completeTaskForCurrentUser(taskId: string): Promise<TaskResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .is('completed_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht erledigt werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Aufgabe wurde nicht gefunden oder ist bereits erledigt.',
    }
  }

  return {
    success: true,
    task: data,
  }
}

export async function reopenTaskForCurrentUser(taskId: string): Promise<TaskResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .not('completed_at', 'is', null)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht wieder geöffnet werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Aufgabe wurde nicht gefunden oder ist bereits offen.',
    }
  }

  return {
    success: true,
    task: data,
  }
}

export async function deleteTaskForCurrentUser(
  taskId: string
): Promise<DeleteTaskResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht gelöscht werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Aufgabe wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}
