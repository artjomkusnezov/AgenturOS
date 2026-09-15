'use server'

import { revalidatePath } from 'next/cache'

import { applyKfzResponseDraft } from '@/features/inbox/lib/kfz-response-draft'
import {
  isValidInboxItemId,
  normalizeInboxContent,
} from '@/features/inbox/lib/validate-inbox-item'
import { updateInboxItemContentForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

/**
 * Saves an internal response draft on the existing inbox working copy.
 * Uses the content-update path only — no send, status, case or task side effect.
 */
export async function saveInboxResponseDraftAction(
  _prevState: InboxItemMutationState,
  formData: FormData,
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')
  const currentContent = String(formData.get('currentContent') ?? '')
  const draft = String(formData.get('draft') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Eingangselement ist ungültig.' }
  }

  const applied = applyKfzResponseDraft(currentContent, draft)
  if (!applied.ok) {
    return { fieldErrors: { draft: applied.error } }
  }

  const result = await updateInboxItemContentForCurrentUser(itemId, {
    content: normalizeInboxContent(applied.content),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app')
  revalidatePath('/app/inbox')

  return {
    success: true,
    itemId: result.item.id,
    noteKind: 'response_draft',
  }
}
