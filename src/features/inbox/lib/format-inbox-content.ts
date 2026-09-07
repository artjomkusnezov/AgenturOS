import type { InboxItem } from '@/features/inbox/types/inbox-item'

const PREVIEW_MAX_LENGTH = 120

export function truncateInboxContentPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()

  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, PREVIEW_MAX_LENGTH).trimEnd()} …`
}

/** List/dashboard title: persisted title first, otherwise a content preview. */
export function getInboxListTitle(
  item: Pick<InboxItem, 'title' | 'content'>,
): string {
  const title = item.title?.trim()
  if (title) {
    return title
  }

  return truncateInboxContentPreview(item.content)
}
