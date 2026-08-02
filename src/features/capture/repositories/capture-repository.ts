import { createClient } from '@/lib/supabase/server'
import { buildCaptureContent } from '@/features/capture/lib/build-capture-content'
import { isValidFileId } from '@/features/files/lib/validate-file'
import { deleteFileForCurrentUser } from '@/features/files/repositories/files-repository'
import { INBOX_SOURCE_UNIVERSAL_CAPTURE } from '@/features/inbox/lib/inbox-source'
import {
  createInboxItemForCurrentUser,
  deleteInboxItemForCurrentUser,
} from '@/features/inbox/repositories/inbox-repository'

type RepositoryError = {
  success: false
  error: string
}

type CaptureInboxResult =
  | { success: true; itemId: string }
  | RepositoryError

type LinkCaptureFileResult = { success: true } | RepositoryError

type DeleteCaptureInboxResult = { success: true } | RepositoryError

export async function createCaptureInboxForCurrentUser(input: {
  content: string
  filenames: string[]
}): Promise<CaptureInboxResult> {
  const resolvedContent = buildCaptureContent(input.content, input.filenames)

  if (!resolvedContent) {
    return {
      success: false,
      error: 'Bitte Text eingeben oder mindestens eine gültige Datei hinzufügen.',
    }
  }

  const inboxResult = await createInboxItemForCurrentUser({
    content: resolvedContent,
    source: INBOX_SOURCE_UNIVERSAL_CAPTURE,
  })

  if (!inboxResult.success) {
    return inboxResult
  }

  return {
    success: true,
    itemId: inboxResult.item.id,
  }
}

export async function linkCaptureFileForCurrentUser(
  inboxItemId: string,
  fileId: string
): Promise<LinkCaptureFileResult> {
  if (!isValidFileId(inboxItemId) || !isValidFileId(fileId)) {
    return {
      success: false,
      error: 'Die Datei konnte dem Eingang nicht zugeordnet werden.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  const { error } = await supabase.from('inbox_item_files').insert({
    inbox_item_id: inboxItemId,
    file_id: fileId,
  })

  if (error) {
    console.error('[capture] inbox_item_files insert failed', {
      inboxItemId,
      fileId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return {
      success: false,
      error: 'Die Datei konnte dem Eingang nicht zugeordnet werden.',
    }
  }

  return { success: true }
}

export async function rollbackCaptureFileForCurrentUser(
  fileId: string
): Promise<{ success: true } | RepositoryError> {
  if (!isValidFileId(fileId)) {
    return {
      success: false,
      error: 'Die Datei konnte nicht entfernt werden.',
    }
  }

  return deleteFileForCurrentUser(fileId)
}

export async function deleteCaptureInboxForCurrentUser(
  inboxItemId: string
): Promise<DeleteCaptureInboxResult> {
  if (!isValidFileId(inboxItemId)) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht gelöscht werden.',
    }
  }

  return deleteInboxItemForCurrentUser(inboxItemId)
}
