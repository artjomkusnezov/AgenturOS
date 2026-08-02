'use server'

import { revalidatePath } from 'next/cache'

import { createCaseForCurrentUser } from '@/features/cases/repositories/case-create-repository'
import { resolvePromotionViewKey } from '@/features/cases/types/inbox-promotion'
import {
  hasCreateCaseFieldErrors,
  normalizeCreateCaseDescription,
  parseCreateCaseFormData,
  validateCreateCaseInput,
} from '@/features/cases/lib/validate-create-case'

export type CreateCaseMutationState = {
  success?: boolean
  caseId?: string
  caseTypeKey?: string
  viewKey?: string
  error?: string
  fieldErrors?: {
    title?: string
    dueAt?: string
    priority?: string
    assigneeUserId?: string
  }
}

export async function createCaseAction(
  _prevState: CreateCaseMutationState,
  formData: FormData,
): Promise<CreateCaseMutationState> {
  const input = parseCreateCaseFormData(formData)
  const fieldErrors = validateCreateCaseInput(input)

  if (hasCreateCaseFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createCaseForCurrentUser({
    caseTypeKey: input.caseTypeKey,
    title: input.title.trim(),
    description: normalizeCreateCaseDescription(input.description),
    assigneeUserId: input.assigneeUserId,
    priority: input.priority,
    dueAt: input.dueAt || null,
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/cases')
  revalidatePath('/app/activity')

  return {
    success: true,
    caseId: result.caseId,
    caseTypeKey: result.caseTypeKey,
    viewKey: resolvePromotionViewKey(result.caseTypeKey),
  }
}
