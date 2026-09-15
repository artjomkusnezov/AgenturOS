/**
 * Detects Kfz website acquisition inbox items from persisted shape.
 * Uses channel/source + normalized inbound_metadata — no parallel lead DB.
 */

import { KFZ_ACQUISITION_PRODUCT } from '@/features/inbound/kfz/lib/build-kfz-inquiry-metadata'
import { readManualKfzCaseChoice } from '@/features/inbound/manual/lib/manual-capture-origin'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isWebsiteInboxItem(
  item: Pick<InboxItem, 'channel' | 'source'>,
): boolean {
  return item.channel === 'website' || item.source === 'website'
}

export function isManualInboxItem(
  item: Pick<InboxItem, 'channel' | 'source'>,
): boolean {
  return item.channel === 'manual' || item.source === 'manual_text'
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
    if (isRecord(acquisition) && acquisition.product === KFZ_ACQUISITION_PRODUCT) {
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

/**
 * True only when an employee explicitly marked a manual capture as Kfz.
 * Never inferred from the source text.
 */
export function isManualKfzInboxItem(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata'>,
): boolean {
  if (!isManualInboxItem(item)) {
    return false
  }

  return readManualKfzCaseChoice(item.inbound_metadata)
}

/** Website Kfz intake or an explicitly chosen manual Kfz working copy. */
export function isKfzInboxItem(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>,
): boolean {
  return isKfzWebsiteInboxItem(item) || isManualKfzInboxItem(item)
}
