'use server'

import { revalidatePath } from 'next/cache'

import { uploadFileForCurrentUser } from '@/features/files/repositories/files-repository'
import {
  hasFileFieldErrors,
  parseUploadFormData,
  validateUploadFile,
} from '@/features/files/lib/validate-file'
import type { FileMutationState } from '@/features/files/types/file'

export async function uploadFileAction(
  _prevState: FileMutationState,
  formData: FormData
): Promise<FileMutationState> {
  const file = parseUploadFormData(formData)
  const fieldErrors = validateUploadFile(file)

  if (hasFileFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  if (!file) {
    return { error: 'Bitte wählen Sie eine Datei aus.' }
  }

  const result = await uploadFileForCurrentUser(file)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/files')

  return {
    success: true,
    fileId: result.file.id,
  }
}
