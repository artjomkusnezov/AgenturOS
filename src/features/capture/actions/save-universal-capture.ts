'use server'

import { revalidatePath } from 'next/cache'

import { createUniversalCaptureForCurrentUser } from '@/features/capture/repositories/capture-repository'
import {
  hasCaptureFieldErrors,
  parseCaptureFormData,
  validateCaptureInput,
} from '@/features/capture/lib/validate-capture'
import type { CaptureMutationState } from '@/features/capture/types/capture'

export async function saveUniversalCaptureAction(
  _prevState: CaptureMutationState,
  formData: FormData
): Promise<CaptureMutationState> {
  const { content, files } = parseCaptureFormData(formData)
  const fieldErrors = validateCaptureInput(content, files)

  if (hasCaptureFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createUniversalCaptureForCurrentUser({ content, files })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app')

  if (result.failedFiles.length > 0) {
    return {
      success: true,
      itemId: result.itemId,
      uploadedFileCount: result.uploadedFileCount,
      failedFiles: result.failedFiles,
    }
  }

  return {
    success: true,
    itemId: result.itemId,
    uploadedFileCount: result.uploadedFileCount,
  }
}
