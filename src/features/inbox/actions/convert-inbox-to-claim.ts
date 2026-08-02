'use server'

import { revalidatePath } from 'next/cache'

import { promoteInboxItem } from '@/features/cases/services/inbox-promotion-service'
import { resolvePromotionViewKey } from '@/features/cases/types/inbox-promotion'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

/**
 * UI-Pfad „Übernehmen als… → Schaden“.
 * Intern: gemeinsame Promotion mit case_type = claim.
 */
export async function convertInboxToClaimAction(
  _prevState: InboxItemMutationState,
  formData: FormData,
): Promise<InboxItemMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return { error: 'Das Eingangselement ist ungültig.' }
  }

  const result = await promoteInboxItem({
    inboxItemId: itemId,
    target: { kind: 'case', caseType: 'claim' },
  })

  if (!result.success) {
    return {
      error: result.error || 'Schaden konnte nicht erstellt werden.',
    }
  }

  if (!result.caseId) {
    return {
      error: 'Schaden konnte nicht erstellt werden.',
    }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app/cases')

  return {
    success: true,
    itemId: result.inboxItemId,
    caseId: result.caseId,
    caseTypeKey: result.caseTypeKey ?? 'claim',
    viewKey: result.viewKey ?? resolvePromotionViewKey('claim'),
    promotionKind: 'claim',
  }
}
