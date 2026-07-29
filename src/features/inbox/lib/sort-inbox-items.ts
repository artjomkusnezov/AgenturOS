import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export function sortUnprocessedInboxItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function sortProcessedInboxItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    const aProcessed = a.processed_at ? new Date(a.processed_at).getTime() : 0
    const bProcessed = b.processed_at ? new Date(b.processed_at).getTime() : 0

    return bProcessed - aProcessed
  })
}

export function partitionAndSortInboxItems(items: InboxItem[]): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
} {
  const unprocessedItems = items.filter(isInboxItemUnprocessed)
  const processedItems = items.filter((item) => !isInboxItemUnprocessed(item))

  return {
    unprocessedItems: sortUnprocessedInboxItems(unprocessedItems),
    processedItems: sortProcessedInboxItems(processedItems),
  }
}
