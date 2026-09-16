'use server'

import { revalidatePath } from 'next/cache'

import {
  getInboxItemsByIdsForCurrentUser,
  processInboxItemForCurrentUser,
  reopenInboxItemForCurrentUser,
  updateInboxItemContentForCurrentUser,
} from '@/features/inbox/repositories/inbox-repository'
import { isValidInboxItemId, normalizeInboxContent } from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  applyKfzLeadStatusCommand,
  isKfzLeadItem,
  isKfzLeadStatus,
  isOpenKfzLeadStatus,
} from '@/features/leads/lib/kfz-lead-status'

/**
 * Sets the employee lead status on the existing inbox working copy.
 * Won / lost close the inbox item. Open statuses reopen it. Nothing is sent.
 */
export async function setKfzLeadStatusAction(
  _prevState: InboxItemMutationState,
  formData: FormData,
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')
  const statusRaw = String(formData.get('status') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Lead-Element ist ungültig.' }
  }

  if (!isKfzLeadStatus(statusRaw)) {
    return { error: 'Der Lead-Status ist ungültig.' }
  }

  const loaded = await getInboxItemsByIdsForCurrentUser([itemId])
  if (!loaded.success) {
    return { error: loaded.error }
  }

  const item = loaded.items[0]
  if (!item) {
    return { error: 'Das Lead-Element wurde nicht gefunden.' }
  }

  if (!isKfzLeadItem(item)) {
    return { error: 'Nur Kfz-Anfragen können als Lead geführt werden.' }
  }

  const applied = applyKfzLeadStatusCommand(
    { content: item.content, processed_at: item.processed_at },
    statusRaw,
    new Date().toISOString(),
  )

  if (!applied.ok) {
    return { error: applied.error }
  }

  if (applied.mutated.content) {
    const updated = await updateInboxItemContentForCurrentUser(itemId, {
      content: normalizeInboxContent(applied.next.content),
    })
    if (!updated.success) {
      return { error: updated.error }
    }
  }

  if (applied.mutated.processed) {
    if (isOpenKfzLeadStatus(statusRaw) && item.processed_at) {
      const reopened = await reopenInboxItemForCurrentUser(itemId)
      if (!reopened.success) {
        return { error: reopened.error }
      }
    } else if (!isOpenKfzLeadStatus(statusRaw) && !item.processed_at) {
      const processed = await processInboxItemForCurrentUser(itemId)
      if (!processed.success) {
        return { error: processed.error }
      }
    }
  }

  revalidatePath('/app')
  revalidatePath('/app/inbox')
  revalidatePath('/app/leads')

  return {
    success: true,
    itemId,
    noteKind: 'lead_status',
  }
}
