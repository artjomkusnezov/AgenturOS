'use server'

import { revalidatePath } from 'next/cache'

import { createCaseTimelineNote } from '@/features/cases/repositories/case-timeline-repository'
import {
  hasCaseTimelineNoteFieldErrors,
  validateCaseTimelineNoteInput,
} from '@/features/cases/lib/validate-case-timeline-note'
import type { CaseTimelineNoteFieldErrors } from '@/features/cases/types/case-timeline'

export type CaseTimelineNoteMutationState = {
  fieldErrors?: CaseTimelineNoteFieldErrors
  error?: string
  success?: boolean
}

export async function createCaseTimelineNoteAction(
  _prevState: CaseTimelineNoteMutationState,
  formData: FormData,
): Promise<CaseTimelineNoteMutationState> {
  const input = {
    caseId: String(formData.get('caseId') ?? ''),
    content: String(formData.get('content') ?? ''),
  }

  const fieldErrors = validateCaseTimelineNoteInput(input)

  if (hasCaseTimelineNoteFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createCaseTimelineNote(input)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/cases')

  return { success: true }
}
