/**
 * Kfz work-queue visibility on existing inbox / dashboard / task surfaces.
 * Reads persisted inbox items and task relations — no CRM, no auto-contact.
 */

import { isKfzWebsiteInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { getInboxListTitle } from '@/features/inbox/lib/format-inbox-content'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  resolveKfzTriagePhase,
  type KfzTriagePhase,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { KFZ_WEBSITE_SOURCE_LABEL } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const KFZ_WORK_QUEUE_FILTER_PARAM = 'phase' as const

export const KFZ_WORK_QUEUE_PHASES = [
  'needs_review',
  'in_review',
  'handled',
] as const satisfies readonly KfzTriagePhase[]

export type KfzWorkQueuePhase = (typeof KFZ_WORK_QUEUE_PHASES)[number]

export type KfzWorkQueueFilter = KfzWorkQueuePhase | 'all'

export type KfzWorkQueueChipKind = 'new' | 'review' | 'handled'

export const KFZ_WORK_QUEUE_PHASE_LABELS: Record<KfzWorkQueuePhase, string> = {
  needs_review: 'Neu',
  in_review: 'In Prüfung',
  handled: 'Erledigt',
}

export const KFZ_WORK_QUEUE_PHASE_CHIP: Record<KfzWorkQueuePhase, KfzWorkQueueChipKind> = {
  needs_review: 'new',
  in_review: 'review',
  handled: 'handled',
}

export const KFZ_FOLLOW_UP_SOURCE_LABEL = 'Zur Anfrage' as const

export type KfzWorkQueueStatusChip = {
  label: string
  kind: KfzWorkQueueChipKind
}

export type KfzWorkQueueRow = {
  itemId: string
  headline: string
  sourceLabel: typeof KFZ_WEBSITE_SOURCE_LABEL
  phase: KfzWorkQueuePhase
  phaseLabel: string
  chip: KfzWorkQueueStatusChip
  href: string
  linkedTaskId: string | null
  followUpTaskHref: string | null
}

export type KfzFollowUpTaskVisibility = {
  taskId: string
  inboxItemId: string
  taskHref: string
  sourceHref: string
  sourceLinkLabel: typeof KFZ_FOLLOW_UP_SOURCE_LABEL
  sourceLabel: typeof KFZ_WEBSITE_SOURCE_LABEL
  appearsInTaskArea: true
  noExternalSideEffect: true
}

export type KfzWorkQueueCounts = Record<KfzWorkQueuePhase, number>

function isKfzWorkQueuePhase(value: string): value is KfzWorkQueuePhase {
  return (KFZ_WORK_QUEUE_PHASES as readonly string[]).includes(value)
}

export function parseKfzWorkQueueFilter(
  value: string | null | undefined,
): KfzWorkQueueFilter {
  if (!value) {
    return 'all'
  }

  const trimmed = value.trim()
  if (trimmed === 'all' || isKfzWorkQueuePhase(trimmed)) {
    return trimmed
  }

  return 'all'
}

export function buildInboxHref(options?: {
  itemId?: string | null
  phase?: KfzWorkQueueFilter | null
}): string {
  const params = new URLSearchParams()
  const phase = options?.phase ?? 'all'

  if (phase !== 'all') {
    params.set(KFZ_WORK_QUEUE_FILTER_PARAM, phase)
  }

  const itemId = options?.itemId?.trim() ?? ''
  if (itemId && isValidInboxItemId(itemId)) {
    params.set('item', itemId)
  }

  const query = params.toString()
  return query ? `/app/inbox?${query}` : '/app/inbox'
}

export function buildTaskHref(taskId: string): string {
  return `/app/tasks?task=${encodeURIComponent(taskId)}`
}

export function resolveInboxLinkedTaskId(
  itemId: string,
  taskRelationsByItemId: Record<string, string> = {},
): string | null {
  return taskRelationsByItemId[itemId] ?? null
}

export function resolveKfzWorkQueuePhase(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'processed_at'>,
  linkedTaskId: string | null = null,
): KfzWorkQueuePhase | null {
  if (!isKfzWebsiteInboxItem(item)) {
    return null
  }

  return resolveKfzTriagePhase(
    { content: item.content, processed_at: item.processed_at ?? null },
    linkedTaskId,
  )
}

export function presentInboxStatusChip(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'processed_at'>,
  linkedTaskId: string | null = null,
): KfzWorkQueueStatusChip | null {
  const phase = resolveKfzWorkQueuePhase(item, linkedTaskId)
  if (phase) {
    return {
      label: KFZ_WORK_QUEUE_PHASE_LABELS[phase],
      kind: KFZ_WORK_QUEUE_PHASE_CHIP[phase],
    }
  }

  if (item.processed_at === null) {
    return { label: 'Neu', kind: 'new' }
  }

  return null
}

export function presentKfzWorkQueueRow(
  item: Pick<
    InboxItem,
    'id' | 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'processed_at'
  >,
  options?: {
    linkedTaskId?: string | null
    phase?: KfzWorkQueueFilter | null
  },
): KfzWorkQueueRow | null {
  const linkedTaskId = options?.linkedTaskId ?? null
  const phase = resolveKfzWorkQueuePhase(item, linkedTaskId)
  if (!phase) {
    return null
  }

  return {
    itemId: item.id,
    headline: getInboxListTitle(item),
    sourceLabel: KFZ_WEBSITE_SOURCE_LABEL,
    phase,
    phaseLabel: KFZ_WORK_QUEUE_PHASE_LABELS[phase],
    chip: {
      label: KFZ_WORK_QUEUE_PHASE_LABELS[phase],
      kind: KFZ_WORK_QUEUE_PHASE_CHIP[phase],
    },
    href: buildInboxHref({ itemId: item.id, phase: options?.phase ?? 'all' }),
    linkedTaskId,
    followUpTaskHref: linkedTaskId ? buildTaskHref(linkedTaskId) : null,
  }
}

export function filterInboxItemsByKfzPhase<T extends InboxItem>(
  items: T[],
  phase: KfzWorkQueueFilter,
  taskRelationsByItemId: Record<string, string> = {},
): T[] {
  if (phase === 'all') {
    return items
  }

  return items.filter((item) => {
    const linkedTaskId = resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)
    return resolveKfzWorkQueuePhase(item, linkedTaskId) === phase
  })
}

export function countKfzWorkQueue(
  items: InboxItem[],
  taskRelationsByItemId: Record<string, string> = {},
): KfzWorkQueueCounts {
  const counts: KfzWorkQueueCounts = {
    needs_review: 0,
    in_review: 0,
    handled: 0,
  }

  for (const item of items) {
    const linkedTaskId = resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)
    const phase = resolveKfzWorkQueuePhase(item, linkedTaskId)
    if (phase) {
      counts[phase] += 1
    }
  }

  return counts
}

/**
 * Explicit follow-up visibility + source trace.
 * Uses the existing inbox item id / cases.source_inbox_item_id boundary.
 */
export function presentKfzFollowUpTask(input: {
  inboxItemId: string
  taskId: string
  sourceInboxItemId?: string | null
}): KfzFollowUpTaskVisibility | null {
  const taskId = input.taskId.trim()
  const inboxItemId = input.inboxItemId.trim()
  const sourceInboxItemId = (input.sourceInboxItemId ?? inboxItemId).trim()

  if (!taskId || !isValidInboxItemId(inboxItemId) || !isValidInboxItemId(sourceInboxItemId)) {
    return null
  }

  return {
    taskId,
    inboxItemId,
    taskHref: buildTaskHref(taskId),
    sourceHref: buildInboxHref({ itemId: sourceInboxItemId }),
    sourceLinkLabel: KFZ_FOLLOW_UP_SOURCE_LABEL,
    sourceLabel: KFZ_WEBSITE_SOURCE_LABEL,
    appearsInTaskArea: true,
    noExternalSideEffect: true,
  }
}

export function presentTaskSourceInboxLink(sourceInboxItemId: string | null | undefined): {
  href: string
  label: 'Zum Eingang'
} | null {
  const itemId = sourceInboxItemId?.trim() ?? ''
  if (!isValidInboxItemId(itemId)) {
    return null
  }

  return {
    href: buildInboxHref({ itemId }),
    label: 'Zum Eingang',
  }
}
