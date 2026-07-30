'use server'

import { revalidatePath } from 'next/cache'

import {
  updateInformationItemForCurrentUser,
} from '@/features/information/repositories/information-repository'
import {
  hasInformationFieldErrors,
  isValidInformationItemId,
  normalizeInformationContent,
  parseInformationFormData,
  validateInformationInput,
} from '@/features/information/lib/validate-information-item'
import type { InformationMutationState } from '@/features/information/types/information-item'

export async function updateInformationItemAction(
  _prevState: InformationMutationState,
  formData: FormData
): Promise<InformationMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInformationItemId(itemId)) {
    return { error: 'Die Information ist ungültig.' }
  }

  const input = parseInformationFormData(formData)
  const fieldErrors = validateInformationInput(input)

  if (hasInformationFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await updateInformationItemForCurrentUser(itemId, {
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
