/**
 * Session store for the local employee leads preview.
 * getSnapshot returns a cached reference until session data actually changes.
 */

import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLeadsPreviewItems,
  KFZ_LEADS_PREVIEW_STORAGE_KEY,
  splitPreviewLeadItems,
} from '@/features/leads/lib/kfz-leads-preview'

const listeners = new Set<() => void>()
const serverSnapshot = (() => {
  const built = buildKfzLeadsPreviewItems()
  return [...built.unprocessedItems, ...built.processedItems]
})()

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

export function subscribeKfzLeadsPreview(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function readKfzLeadsPreviewItems(): InboxItem[] {
  if (typeof window === 'undefined') {
    return cachedItems
  }

  const raw = window.sessionStorage.getItem(KFZ_LEADS_PREVIEW_STORAGE_KEY)
  if (raw === cachedRaw) {
    return cachedItems
  }

  cachedRaw = raw
  cachedItems = parseItems(raw)
  return cachedItems
}

export function readKfzLeadsPreviewServerSnapshot(): InboxItem[] {
  return serverSnapshot
}

export function writeKfzLeadsPreviewItems(items: InboxItem[]): InboxItem[] {
  const raw = JSON.stringify(items)
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(KFZ_LEADS_PREVIEW_STORAGE_KEY, raw)
  }
  cachedRaw = raw
  cachedItems = items
  emit()
  return items
}

export function readKfzLeadsPreviewSplit() {
  return splitPreviewLeadItems(readKfzLeadsPreviewItems())
}
