'use server'

import { revalidatePath } from 'next/cache'

import {
  applyInboxDuplicateDecision,
  parseInboxDuplicateFieldIds,
  type InboxDuplicateDecisionType,
} from '@/features/inbox/lib/inbox-exact-duplicate-review'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  getInboxItemsByIdsForCurrentUser,
  updateInboxItemInboundMetadataForCurrentUser,
} from '@/features/inbox/repositories/inbox-repository'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

function parseDecisionType(value: string): InboxDuplicateDecisionType | null {
  if (value === 'dismiss' || value === 'relate' || value === 'unlink') {
    return value
  }
  return null
}

/**
 * Records an explicit employee duplicate decision on existing working copies.
 * Writes only inbound_metadata — no merge, delete, status, send or contact.
 */
export async function applyInboxDuplicateDecisionAction(
  _prevState: InboxItemMutationState,
  formData: FormData,
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')
  const otherItemId = String(formData.get('otherItemId') ?? '')
  const type = parseDecisionType(String(formData.get('type') ?? ''))
  const fieldIds = parseInboxDuplicateFieldIds(String(formData.get('fieldIds') ?? ''))

  if (!isValidInboxItemId(itemId) || !isValidInboxItemId(otherItemId) || !type) {
    return { error: 'Die Duplikat-Entscheidung ist ungültig.' }
  }

  const loaded = await getInboxItemsByIdsForCurrentUser([itemId, otherItemId])
  if (!loaded.success) {
    return { error: loaded.error }
  }

  const current = loaded.items.find((item) => item.id === itemId)
  const other = loaded.items.find((item) => item.id === otherItemId)
  if (!current || !other) {
    return { error: 'Die Vergleichsanfrage wurde nicht gefunden.' }
  }

  const contentBefore = {
    current: current.content,
    other: other.content,
    currentProcessed: current.processed_at,
    otherProcessed: other.processed_at,
  }

  const command =
    type === 'unlink'
      ? { type, otherItemId }
      : { type, otherItemId, fieldIds }

  const applied = applyInboxDuplicateDecision(current, other, command)
  if (!applied.ok) {
    return { error: applied.error }
  }

  if (
    applied.current.content !== contentBefore.current ||
    applied.other.content !== contentBefore.other ||
    applied.current.processed_at !== contentBefore.currentProcessed ||
    applied.other.processed_at !== contentBefore.otherProcessed
  ) {
    return { error: 'Die Duplikat-Entscheidung darf Inhalt und Status nicht ändern.' }
  }

  const currentWrite = await updateInboxItemInboundMetadataForCurrentUser(
    applied.current.id,
    applied.current.inbound_metadata,
  )
  if (!currentWrite.success) {
    return { error: currentWrite.error }
  }

  if (applied.other.id !== applied.current.id && applied.other !== other) {
    const otherChanged =
      JSON.stringify(applied.other.inbound_metadata) !== JSON.stringify(other.inbound_metadata)
    if (otherChanged) {
      const otherWrite = await updateInboxItemInboundMetadataForCurrentUser(
        applied.other.id,
        applied.other.inbound_metadata,
      )
      if (!otherWrite.success) {
        return { error: otherWrite.error }
      }
    }
  }

  revalidatePath('/app')
  revalidatePath('/app/inbox')

  return {
    success: true,
    itemId: currentWrite.item.id,
    noteKind:
      type === 'dismiss' ? 'duplicate_dismissed' : type === 'relate' ? 'related_marked' : 'related_removed',
  }
}
