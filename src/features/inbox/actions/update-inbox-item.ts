'use server'

import { revalidatePath } from 'next/cache'

import { updateInboxItemContentForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import {
  hasInboxItemFieldErrors,
  isValidInboxItemId,
  normalizeInboxContent,
  parseInboxItemFormData,
  validateInboxItemInput,
} from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

export async function updateInboxItemAction(
  _prevState: InboxItemMutationState,
  formData: FormData
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Eingangselement ist ungültig.' }
  }

  const input = parseInboxItemFormData(formData)
  const fieldErrors = validateInboxItemInput(input)

  if (hasInboxItemFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await updateInboxItemContentForCurrentUser(itemId, {
    content: normalizeInboxContent(input.content),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/inbox')

  return {
    success: true,
    itemId: result.item.id,
  }
}
