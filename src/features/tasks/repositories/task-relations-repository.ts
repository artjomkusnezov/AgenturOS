import {
  validateTaskFileRelationInput,
  validateTaskInformationRelationInput,
} from '@/features/tasks/lib/validate-task-relation'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import { getTaskById } from '@/features/tasks/repositories/tasks-repository'
import type {
  TaskLinkedFile,
  TaskLinkedInformation,
} from '@/features/tasks/types/task-relation'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTaskFilesResult =
  | { success: true; files: TaskLinkedFile[] }
  | RepositoryError

type ListTaskInformationResult =
  | { success: true; information: TaskLinkedInformation[] }
  | RepositoryError

type RelationMutationResult = { success: true } | RepositoryError

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


export async function listFilesForTask(taskId: string): Promise<ListTaskFilesResult> {
  if (!isValidTaskId(taskId)) {
    return {
      success: false,
      error: 'Bitte geben Sie einen gültigen Vorgang an.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_file_relations')
    .select('id, created_at, files(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die verknüpften Dateien konnten nicht geladen werden.',
    }
  }

  const files: TaskLinkedFile[] = []

  for (const row of data) {
    const file = row.files

    if (!file || Array.isArray(file)) {
      continue
    }

    files.push({
      relationId: row.id,
      linkedAt: row.created_at,
      file,
    })
  }

  return {
    success: true,
    files,
  }
}

export async function attachFileToTask(
  taskId: string,
  fileId: string,
): Promise<RelationMutationResult> {
  const inputError = validateTaskFileRelationInput({ taskId, fileId })

  if (inputError) {
    return { success: false, error: inputError }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('attach_file_to_task', {
    p_task_id: taskId,
    p_file_id: fileId,
  })

  if (error) {
    if (error.message.includes('file already linked')) {
      return {
        success: false,
        error: 'Diese Datei ist bereits mit dem Vorgang verknüpft.',
      }
    }

    if (error.message.includes('file not found')) {
      return {
        success: false,
        error: 'Die Datei konnte nicht gefunden werden.',
      }
    }

    if (error.message.includes('task not found') || error.message.includes('access denied')) {
      return {
        success: false,
        error: 'Der Vorgang konnte nicht gefunden werden.',
      }
    }

    return {
      success: false,
      error: 'Die Datei konnte nicht verknüpft werden.',
    }
  }

  return { success: true }
}

export async function detachFileFromTask(
  taskId: string,
  fileId: string,
): Promise<RelationMutationResult> {
  const inputError = validateTaskFileRelationInput({ taskId, fileId })

  if (inputError) {
    return { success: false, error: inputError }
  }

  const taskResult = await getTaskById(taskId)

  if (!taskResult.success) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht gefunden werden.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_file_relations')
    .delete()
    .eq('task_id', taskId)
    .eq('file_id', fileId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Verknüpfung konnte nicht entfernt werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Verknüpfung wurde nicht gefunden.',
    }
  }

  return { success: true }
}

export async function listInformationForTask(
  taskId: string,
): Promise<ListTaskInformationResult> {
  if (!isValidTaskId(taskId)) {
    return {
      success: false,
      error: 'Bitte geben Sie einen gültigen Vorgang an.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_information_relations')
    .select('id, created_at, information_items(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die verknüpften Informationen konnten nicht geladen werden.',
    }
  }

  const information: TaskLinkedInformation[] = []

  for (const row of data) {
    const item = row.information_items

    if (!item || Array.isArray(item)) {
      continue
    }

    information.push({
      relationId: row.id,
      linkedAt: row.created_at,
      information: item,
    })
  }

  return {
    success: true,
    information,
  }
}

export async function attachInformationToTask(
  taskId: string,
  informationId: string,
): Promise<RelationMutationResult> {
  const inputError = validateTaskInformationRelationInput({ taskId, informationId })

  if (inputError) {
    return { success: false, error: inputError }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('attach_information_to_task', {
    p_task_id: taskId,
    p_information_id: informationId,
  })

  if (error) {
    if (error.message.includes('information already linked')) {
      return {
        success: false,
        error: 'Diese Information ist bereits mit dem Vorgang verknüpft.',
      }
    }

    if (error.message.includes('information not found') || error.message.includes('access denied')) {
      return {
        success: false,
        error: 'Die Information konnte nicht gefunden werden.',
      }
    }

    if (error.message.includes('task not found')) {
      return {
        success: false,
        error: 'Der Vorgang konnte nicht gefunden werden.',
      }
    }

    return {
      success: false,
      error: 'Die Information konnte nicht verknüpft werden.',
    }
  }

  return { success: true }
}

export async function detachInformationFromTask(
  taskId: string,
  informationId: string,
): Promise<RelationMutationResult> {
  const inputError = validateTaskInformationRelationInput({ taskId, informationId })

  if (inputError) {
    return { success: false, error: inputError }
  }

  const taskResult = await getTaskById(taskId)

  if (!taskResult.success) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht gefunden werden.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_information_relations')
    .delete()
    .eq('task_id', taskId)
    .eq('information_id', informationId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Verknüpfung konnte nicht entfernt werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Verknüpfung wurde nicht gefunden.',
    }
  }

  return { success: true }
}
