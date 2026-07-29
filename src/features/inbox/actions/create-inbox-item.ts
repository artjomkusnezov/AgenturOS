'use server'

import { revalidatePath } from 'next/cache'

import { createInboxItemForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import {
  hasInboxItemFieldErrors,
  normalizeInboxContent,
  parseInboxItemFormData,
  validateInboxItemInput,
} from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

export async function createInboxItemAction(
  _prevState: InboxItemMutationState,
  formData: FormData
): Promise<InboxItemMutationState> {
  const input = parseInboxItemFormData(formData)
  const fieldErrors = validateInboxItemInput(input)

  if (hasInboxItemFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await createInboxItemForCurrentUser({
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
