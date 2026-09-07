import { isKfzWebsiteInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { KFZ_WEBSITE_SOURCE_LABEL } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const INBOX_SOURCE_MANUAL_TEXT = 'manual_text' as const satisfies InboxItem['source']

export const INBOX_SOURCE_UNIVERSAL_CAPTURE = 'universal_capture' as const satisfies InboxItem['source']

export const INBOX_SOURCE_WHATSAPP = 'whatsapp' as const satisfies InboxItem['source']

export const INBOX_SOURCE_EMAIL = 'email' as const satisfies InboxItem['source']

export const INBOX_SOURCE_LABELS: Record<string, string> = {
  manual_text: 'Manuell',
  universal_capture: 'Neu erfasst',
  whatsapp: 'WhatsApp',
  email: 'E-Mail',
  website: 'Website',
}

export function getInboxSourceLabel(source: InboxItem['source']): string {
  return INBOX_SOURCE_LABELS[source] ?? 'Eingang'
}

/** Source label for a concrete inbox item — Kfz website stays recognizable. */
export function getInboxItemSourceLabel(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>,
): string {
  if (isKfzWebsiteInboxItem(item)) {
    return KFZ_WEBSITE_SOURCE_LABEL
  }

  return getInboxSourceLabel(item.source)
}
