import { createClient } from '@/lib/supabase/server'
import { buildCaptureContent } from '@/features/capture/lib/build-capture-content'
import { getValidCaptureFiles } from '@/features/capture/lib/validate-capture'
import type { CaptureFailedFile } from '@/features/capture/types/capture'
import {
  deleteFileForCurrentUser,
  uploadFileForCurrentUser,
} from '@/features/files/repositories/files-repository'
import { INBOX_SOURCE_UNIVERSAL_CAPTURE } from '@/features/inbox/lib/inbox-source'
import {
  createInboxItemForCurrentUser,
  deleteInboxItemForCurrentUser,
} from '@/features/inbox/repositories/inbox-repository'

type RepositoryError = {
  success: false
  error: string
}

type UniversalCaptureResult =
  | {
      success: true
      itemId: string
      uploadedFileCount: number
      failedFiles: CaptureFailedFile[]
    }
  | RepositoryError

async function linkInboxItemFileForCurrentUser(
  inboxItemId: string,
  fileId: string
): Promise<{ success: true } | RepositoryError> {
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
    return {
      success: false,
      error: 'Die Datei konnte dem Eingang nicht zugeordnet werden.',
    }
  }

  return { success: true }
}

export async function createUniversalCaptureForCurrentUser(input: {
  content: string
  files: File[]
}): Promise<UniversalCaptureResult> {
  const validFiles = getValidCaptureFiles(input.files)
  const content = buildCaptureContent(
    input.content,
    validFiles.map((file) => file.name)
  )

  if (!content) {
    return {
      success: false,
      error: 'Bitte Text eingeben oder mindestens eine gültige Datei hinzufügen.',
    }
  }

  const inboxResult = await createInboxItemForCurrentUser({
    content,
    source: INBOX_SOURCE_UNIVERSAL_CAPTURE,
  })

  if (!inboxResult.success) {
    return inboxResult
  }

  if (validFiles.length === 0) {
    return {
      success: true,
      itemId: inboxResult.item.id,
      uploadedFileCount: 0,
      failedFiles: [],
    }
  }

  const failedFiles: CaptureFailedFile[] = []
  let uploadedFileCount = 0

  for (const file of validFiles) {
    const uploadResult = await uploadFileForCurrentUser(file)

    if (!uploadResult.success) {
      failedFiles.push({
        filename: file.name,
        error: uploadResult.error,
      })
      continue
    }

    const linkResult = await linkInboxItemFileForCurrentUser(
      inboxResult.item.id,
      uploadResult.file.id
    )

    if (!linkResult.success) {
      await deleteFileForCurrentUser(uploadResult.file.id)
      failedFiles.push({
        filename: file.name,
        error: linkResult.error,
      })
      continue
    }

    uploadedFileCount += 1
  }

  if (uploadedFileCount === 0) {
    await deleteInboxItemForCurrentUser(inboxResult.item.id)

    return {
      success: false,
      error:
        failedFiles.length === 1
          ? failedFiles[0].error
          : 'Die Dateien konnten nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    itemId: inboxResult.item.id,
    uploadedFileCount,
    failedFiles,
  }
}
