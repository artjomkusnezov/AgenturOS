import type { InboxItem } from '@/features/inbox/types/inbox-item'

export function isInboxItemUnprocessed(item: InboxItem): boolean {
  return item.processed_at === null
}

export function formatInboxDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

export function formatInboxListDate(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}
