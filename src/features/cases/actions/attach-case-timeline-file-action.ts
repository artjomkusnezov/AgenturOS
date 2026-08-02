'use server'

import { revalidatePath } from 'next/cache'

import { uploadAndAttachFileToCase } from '@/features/cases/repositories/case-timeline-repository'
import { isValidCaseId } from '@/features/cases/lib/validate-case-timeline-note'
import {
  hasFileFieldErrors,
  parseUploadFormData,
  validateUploadFile,
} from '@/features/files/lib/validate-file'
import type { CaseTimelineAttachmentFieldErrors } from '@/features/cases/types/case-timeline'

export type CaseTimelineFileMutationState = {
  fieldErrors?: CaseTimelineAttachmentFieldErrors
  error?: string
  success?: boolean
}

export async function attachCaseTimelineFileAction(
  _prevState: CaseTimelineFileMutationState,
  formData: FormData,
): Promise<CaseTimelineFileMutationState> {
  const caseId = String(formData.get('caseId') ?? '')
  const file = parseUploadFormData(formData)
  const fieldErrors: CaseTimelineAttachmentFieldErrors = {}

  if (!isValidCaseId(caseId)) {
    fieldErrors.caseId = 'Bitte geben Sie eine gültige Vorgangs-ID an.'
  }

  const fileFieldErrors = validateUploadFile(file)
  if (hasFileFieldErrors(fileFieldErrors)) {
    fieldErrors.file = fileFieldErrors.file
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  if (!file) {
    return { fieldErrors: { file: 'Bitte wählen Sie eine Datei aus.' } }
  }

  const result = await uploadAndAttachFileToCase(caseId, file)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/cases')
  revalidatePath('/app/files')

  return { success: true }
}
