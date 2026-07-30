'use server'

import { revalidatePath } from 'next/cache'

import { deleteFileForCurrentUser } from '@/features/files/repositories/files-repository'
import { isValidFileId } from '@/features/files/lib/validate-file'
import type { FileMutationState } from '@/features/files/types/file'

export async function deleteFileAction(
  _prevState: FileMutationState,
  formData: FormData
): Promise<FileMutationState> {
  const fileId = String(formData.get('fileId') ?? '')

  if (!isValidFileId(fileId)) {
    return { error: 'Die Datei ist ungültig.' }
  }

  const result = await deleteFileForCurrentUser(fileId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/files')

  return {
    success: true,
  }
}
