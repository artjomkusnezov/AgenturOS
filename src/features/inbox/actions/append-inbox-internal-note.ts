'use server'

import { revalidatePath } from 'next/cache'

import {
  appendInternalInboxNote,
  KFZ_CONTACTED_NOTE,
  KFZ_FOLLOW_UP_NOTE,
  KFZ_REPLY_PREPARED_NOTE,
  KFZ_REVIEW_STARTED_NOTE,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  isValidInboxItemId,
  normalizeInboxContent,
} from '@/features/inbox/lib/validate-inbox-item'
import { updateInboxItemContentForCurrentUser } from '@/features/inbox/repositories/inbox-repository'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

/**
 * Appends an operator-only note to the existing inbox working copy.
 * Uses the existing content-update path — no new status, no outbound send.
 */
export async function appendInboxInternalNoteAction(
  _prevState: InboxItemMutationState,
  formData: FormData,
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')
  const currentContent = String(formData.get('currentContent') ?? '')
  const kindRaw = String(formData.get('kind') ?? 'internal_note')
  const kind =
    kindRaw === 'start_review'
      ? 'start_review'
      : kindRaw === 'prepare_reply'
        ? 'prepare_reply'
        : kindRaw === 'mark_contacted'
          ? 'mark_contacted'
          : kindRaw === 'mark_follow_up'
            ? 'mark_follow_up'
            : 'internal_note'
  const note =
    kind === 'start_review'
      ? KFZ_REVIEW_STARTED_NOTE
      : kind === 'prepare_reply'
        ? KFZ_REPLY_PREPARED_NOTE
        : kind === 'mark_contacted'
          ? KFZ_CONTACTED_NOTE
          : kind === 'mark_follow_up'
            ? KFZ_FOLLOW_UP_NOTE
            : String(formData.get('note') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Eingangselement ist ungültig.' }
  }

  const appended = appendInternalInboxNote(currentContent, note)
  if (!appended.ok) {
    return { fieldErrors: { note: appended.error } }
  }

  const result = await updateInboxItemContentForCurrentUser(itemId, {
    content: normalizeInboxContent(appended.content),
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app')
  revalidatePath('/app/inbox')

  return {
    success: true,
    itemId: result.item.id,
    noteKind: kind,
  }
}
