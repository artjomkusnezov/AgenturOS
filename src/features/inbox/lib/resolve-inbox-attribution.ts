import {
  formatInboundSenderLabel,
  isExternalInboundChannel,
} from '@/features/inbound/lib/inbound-item-utils'
import type { InboundSenderRecord } from '@/features/inbound/types/inbound-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'

/**
 * Anzeigeattribut: bei externen Quellen Absender aus `sender`,
 * sonst Profilname des Audit-Akteurs (user_id).
 * Capture bleibt „Mensch im Produkt“ → Mitgliedsname.
 */
export function resolveInboxAttributionLabel(
  item: Pick<InboxItem, 'user_id' | 'channel' | 'sender'>,
  memberNameMap: Record<string, string>,
): string {
  if (isExternalInboundChannel(item.channel)) {
    const senderLabel = formatInboundSenderLabel(item.sender as InboundSenderRecord | null)
    if (senderLabel) {
      return senderLabel
    }
  }

  return resolveTaskMemberName(item.user_id, memberNameMap)
}
