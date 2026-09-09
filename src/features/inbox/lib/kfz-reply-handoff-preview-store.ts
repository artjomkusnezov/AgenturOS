/**
 * Session store for the local reply-handoff preview.
 * getSnapshot returns a cached reference until session data actually changes.
 */

import {
  buildKfzReplyHandoffPreviewItems,
  KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY,
  listKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

const listeners = new Set<() => void>()
const serverSnapshot = listKfzReplyHandoffPreviewItems(buildKfzReplyHandoffPreviewItems())

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

export function subscribeKfzReplyHandoffPreview(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function readKfzReplyHandoffPreviewItems(): InboxItem[] {
  if (typeof window === 'undefined') {
    return cachedItems
  }

  const raw = window.sessionStorage.getItem(KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY)
  if (raw === cachedRaw) {
    return cachedItems
  }

  cachedRaw = raw
  cachedItems = parseItems(raw)
  return cachedItems
}

export function readKfzReplyHandoffPreviewServerSnapshot(): InboxItem[] {
  return serverSnapshot
}

export function writeKfzReplyHandoffPreviewItems(items: InboxItem[]): InboxItem[] {
  const raw = JSON.stringify(items)
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY, raw)
  }
  cachedRaw = raw
  cachedItems = items
  emit()
  return items
}
