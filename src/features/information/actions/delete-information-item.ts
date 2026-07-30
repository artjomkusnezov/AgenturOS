'use server'

import { revalidatePath } from 'next/cache'

import { deleteInformationItemForCurrentUser } from '@/features/information/repositories/information-repository'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'
import type { InformationMutationState } from '@/features/information/types/information-item'

export async function deleteInformationItemAction(
  _prevState: InformationMutationState,
  formData: FormData
): Promise<InformationMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInformationItemId(itemId)) {
    return { error: 'Die Information ist ungültig.' }
  }

  const result = await deleteInformationItemForCurrentUser(itemId)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/information')

  return {
    success: true,
  }
}
