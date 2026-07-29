import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/features/tasks/types/task'

type RepositoryError = {
  success: false
  error: string
}

type ListTasksResult =
  | { success: true; tasks: Task[] }
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
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', authResult.userId)
    .order('updated_at', { ascending: false })

  if (error) {
    return {
      success: false,
      error: 'Die Aufgaben konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    tasks: data,
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
    .eq('user_id', authResult.userId)
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
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: authResult.userId,
      title: input.title,
      description: input.description,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Aufgabe konnte nicht erstellt werden.',
    }
  }

  return {
    success: true,
    task: data,
  }
}

export async function updateTaskForCurrentUser(
  taskId: string,
  input: TaskWriteInput
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', authResult.userId)
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
    .eq('user_id', authResult.userId)
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
