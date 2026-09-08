/**
 * Human-controlled source filters on the existing inbox working copies.
 * No automatic classification — only persisted Kfz / manual-origin facts.
 */

import { isKfzInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { readManualCaptureOriginKind } from '@/features/inbound/manual/lib/manual-capture-origin'
import {
  MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import { buildInboxHref, type KfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const INBOX_SOURCE_FILTER_PARAM = 'source' as const

export const INBOX_SOURCE_FILTERS = [
  'all',
  'kfz',
  'other',
  'phone',
  'pasted_email',
  'own_note',
] as const

export type InboxSourceFilter = (typeof INBOX_SOURCE_FILTERS)[number]

export type InboxSourceFilterCounts = Record<InboxSourceFilter, number>

export const INBOX_SOURCE_FILTER_NAV_LABEL = 'Eingang' as const

export const INBOX_SOURCE_FILTER_LABELS: Record<InboxSourceFilter, string> = {
  all: 'Alle',
  kfz: 'Kfz',
  other: 'Andere',
  phone: MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL,
  pasted_email: MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL,
  own_note: MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL,
}

export function isInboxSourceFilter(value: string): value is InboxSourceFilter {
  return (INBOX_SOURCE_FILTERS as readonly string[]).includes(value)
}

export function parseInboxSourceFilter(
  value: string | null | undefined,
): InboxSourceFilter {
  if (!value) {
    return 'all'
  }

  const trimmed = value.trim()
  return isInboxSourceFilter(trimmed) ? trimmed : 'all'
}

export function emptyInboxSourceFilterCounts(): InboxSourceFilterCounts {
  return {
    all: 0,
    kfz: 0,
    other: 0,
    phone: 0,
    pasted_email: 0,
    own_note: 0,
  }
}

function matchesManualOrigin(
  item: Pick<InboxItem, 'inbound_metadata'>,
  originKind: 'phone_call' | 'pasted_email' | 'personal_note',
): boolean {
  return readManualCaptureOriginKind(item.inbound_metadata) === originKind
}

export function matchesInboxSourceFilter(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>,
  filter: InboxSourceFilter,
): boolean {
  if (filter === 'all') {
    return true
  }

  if (filter === 'kfz') {
    return isKfzInboxItem(item)
  }

  if (filter === 'other') {
    return !isKfzInboxItem(item)
  }

  if (filter === 'phone') {
    return matchesManualOrigin(item, 'phone_call')
  }

  if (filter === 'pasted_email') {
    return matchesManualOrigin(item, 'pasted_email')
  }

  return matchesManualOrigin(item, 'personal_note')
}

export function filterInboxItemsBySource<T extends InboxItem>(
  items: T[],
  filter: InboxSourceFilter,
): T[] {
  if (filter === 'all') {
    return items
  }

  return items.filter((item) => matchesInboxSourceFilter(item, filter))
}

export function buildInboxSourceFilterHrefs(options?: {
  selectedItemId?: string | null
  selectedItem?: Pick<
    InboxItem,
    'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'
  > | null
  phase?: KfzWorkQueueFilter | null
  basePath?: string | null
}): Record<InboxSourceFilter, string> {
  const hrefs = {} as Record<InboxSourceFilter, string>

  for (const filter of INBOX_SOURCE_FILTERS) {
    const keepItem =
      Boolean(options?.selectedItemId) &&
      (filter === 'all' ||
        (options?.selectedItem
          ? matchesInboxSourceFilter(options.selectedItem, filter)
          : false))
    hrefs[filter] = buildInboxHref({
      source: filter,
      phase: options?.phase ?? 'all',
      itemId: keepItem ? options?.selectedItemId : null,
      basePath: options?.basePath,
    })
  }

  return hrefs
}

export function countInboxSourceFilters(
  items: Array<
    Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>
  >,
): InboxSourceFilterCounts {
  const counts = emptyInboxSourceFilterCounts()
  counts.all = items.length

  for (const item of items) {
    if (isKfzInboxItem(item)) {
      counts.kfz += 1
    } else {
      counts.other += 1
    }

    const originKind = readManualCaptureOriginKind(item.inbound_metadata)
    if (originKind === 'phone_call') {
      counts.phone += 1
    } else if (originKind === 'pasted_email') {
      counts.pasted_email += 1
    } else if (originKind === 'personal_note') {
      counts.own_note += 1
    }
  }

  return counts
}
