import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const INBOX_SOURCE_MANUAL_TEXT = 'manual_text' as const satisfies InboxItem['source']

export const INBOX_SOURCE_LABELS: Record<InboxItem['source'], string> = {
  manual_text: 'Manuell',
}

export function getInboxSourceLabel(source: InboxItem['source']): string {
  return INBOX_SOURCE_LABELS[source]
}
