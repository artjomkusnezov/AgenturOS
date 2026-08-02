import { isValidCaseId } from '@/features/cases/lib/validate-case-timeline-note'
import { isValidFileId } from '@/features/files/lib/validate-file'
import type {
  AttachCaseFileInput,
  CaseTimelineAttachmentFieldErrors,
} from '@/features/cases/types/case-timeline'

export function validateAttachCaseFileInput(
  input: AttachCaseFileInput,
): CaseTimelineAttachmentFieldErrors {
  const errors: CaseTimelineAttachmentFieldErrors = {}

  if (!isValidCaseId(input.caseId)) {
    errors.caseId = 'Bitte geben Sie eine gültige Vorgangs-ID an.'
  }

  if (!isValidFileId(input.fileId)) {
    errors.fileId = 'Bitte geben Sie eine gültige Datei-ID an.'
  }

  return errors
}

export function hasCaseTimelineAttachmentFieldErrors(
  errors: CaseTimelineAttachmentFieldErrors,
): boolean {
  return Object.keys(errors).length > 0
}
