/**
 * Detects Kfz website acquisition inbox items from persisted shape.
 * Uses channel/source + normalized inbound_metadata — no parallel lead DB.
 */

import type { InboxItem } from '@/features/inbox/types/inbox-item'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isWebsiteInboxItem(
  item: Pick<InboxItem, 'channel' | 'source'>,
): boolean {
  return item.channel === 'website' || item.source === 'website'
}

/**
 * True when the inbox item is a Gate-2/3 Kfz website inquiry working copy.
 */
export function isKfzWebsiteInboxItem(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>,
): boolean {
  if (!isWebsiteInboxItem(item)) {
    return false
  }

  const meta = item.inbound_metadata
  if (isRecord(meta)) {
    const acquisition = meta.acquisition
    if (isRecord(acquisition) && acquisition.product === 'kfz') {
      return true
    }
  }

  const title = item.title?.trim() ?? ''
  if (/^kfz-anfrage\b/i.test(title)) {
    return true
  }

  const content = item.content?.trim() ?? ''
  if (/^kfz-anfrage\b/i.test(content)) {
    return true
  }

  return false
}
