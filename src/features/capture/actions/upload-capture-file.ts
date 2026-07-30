'use server'

import { revalidatePath } from 'next/cache'

import { getCaptureFileValidationMessage } from '@/features/capture/lib/validate-capture-file'
import { uploadFileForCurrentUser } from '@/features/files/repositories/files-repository'
import type { CaptureUploadFileActionResult } from '@/features/capture/types/capture'
import { parseUploadFormData } from '@/features/files/lib/validate-file'

export async function uploadCaptureFileAction(
  formData: FormData
): Promise<CaptureUploadFileActionResult> {
  const file = parseUploadFormData(formData)
  const validationMessage = file ? getCaptureFileValidationMessage(file) : 'Bitte wählen Sie eine Datei aus.'

  if (!file || validationMessage) {
    return {
      fieldErrors: {
        file: validationMessage ?? 'Bitte wählen Sie eine Datei aus.',
      },
    }
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
