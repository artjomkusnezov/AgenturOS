/**
 * Session store for the local reply-handoff preview.
 * Used with useSyncExternalStore so reload restore does not setState in an effect.
 */

import {
  buildKfzReplyHandoffPreviewItems,
  KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY,
  listKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

const listeners = new Set<() => void>()

function seedItems(): InboxItem[] {
  return listKfzReplyHandoffPreviewItems(buildKfzReplyHandoffPreviewItems())
}

function emit() {
  for (const listener of listeners) {
    listener()
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
    return seedItems()
  }

  try {
    const raw = window.sessionStorage.getItem(KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY)
    if (!raw) {
      return seedItems()
    }
    const parsed = JSON.parse(raw) as InboxItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedItems()
    }
    return parsed
  } catch {
    return seedItems()
  }
}

export function readKfzReplyHandoffPreviewServerSnapshot(): InboxItem[] {
  return seedItems()
}

export function writeKfzReplyHandoffPreviewItems(items: InboxItem[]): InboxItem[] {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY,
      JSON.stringify(items),
    )
  }
  emit()
  return items
}
