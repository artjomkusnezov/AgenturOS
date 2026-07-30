'use server'

import { revalidatePath } from 'next/cache'

import {
  createInformationItemForCurrentUser,
} from '@/features/information/repositories/information-repository'
import {
  hasInformationFieldErrors,
  normalizeInformationContent,
  parseInformationFormData,
  validateInformationInput,
} from '@/features/information/lib/validate-information-item'
import type { InformationMutationState } from '@/features/information/types/information-item'

export async function createInformationItemAction(
  _prevState: InformationMutationState,
  formData: FormData
): Promise<InformationMutationState> {
  const input = parseInformationFormData(formData)
  const fieldErrors = validateInformationInput(input)

  if (hasInformationFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createInformationItemForCurrentUser({
    title: input.title.trim(),
    content: normalizeInformationContent(input.content),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/information')

  return {
    success: true,
    itemId: result.item.id,
  }
}
