/**
 * Session store for the local unified inbox / factual work-queue preview.
 * getSnapshot returns a cached reference until session data actually changes.
 */

import {
  buildUnifiedInboxPreviewItems,
  listUnifiedInboxPreviewItems,
  UNIFIED_INBOX_PREVIEW_STORAGE_KEY,
} from '@/features/inbox/lib/unified-inbox-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

const listeners = new Set<() => void>()
const serverSnapshot = listUnifiedInboxPreviewItems(buildUnifiedInboxPreviewItems())

let cachedRaw: string | null | undefined
let cachedItems: InboxItem[] = serverSnapshot

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function parseItems(raw: string | null): InboxItem[] {
  if (!raw) {
    return serverSnapshot
  }

  try {
    const parsed = JSON.parse(raw) as InboxItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return serverSnapshot
    }
    return parsed
  } catch {
    return serverSnapshot
  }
}

export function subscribeUnifiedInboxPreview(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function readUnifiedInboxPreviewItems(): InboxItem[] {
  if (typeof window === 'undefined') {
    return cachedItems
  }

  const raw = window.sessionStorage.getItem(UNIFIED_INBOX_PREVIEW_STORAGE_KEY)
  if (raw === cachedRaw) {
    return cachedItems
  }

  cachedRaw = raw
  cachedItems = parseItems(raw)
  return cachedItems
}

export function readUnifiedInboxPreviewServerSnapshot(): InboxItem[] {
  return serverSnapshot
}

export function writeUnifiedInboxPreviewItems(items: InboxItem[]): InboxItem[] {
  const raw = JSON.stringify(items)
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(UNIFIED_INBOX_PREVIEW_STORAGE_KEY, raw)
  }
  cachedRaw = raw
  cachedItems = items
  emit()
  return items
}
