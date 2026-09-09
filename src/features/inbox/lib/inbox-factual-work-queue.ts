/**
 * Factual unattended-inbound work queue on existing inbox working copies.
 * Uses received time, explicit statuses and history events only —
 * no urgency, SLA, scoring or customer communication.
 */

import {
  INBOX_HISTORY_NO_TIMESTAMP_LABEL,
  presentInboxManualReviewHistory,
} from '@/features/inbox/lib/inbox-manual-review-history'
import {
  hasInternalInboxNote,
  hasKfzReviewStartedNote,
  resolveKfzTriagePhase,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  hasKfzContactedNote,
  hasKfzFollowUpNote,
  labelKfzPreferredChannel,
} from '@/features/inbox/lib/kfz-reply-handoff'
import { hasKfzResponseDraft } from '@/features/inbox/lib/kfz-response-draft'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import {
  buildInboxHref,
  INBOX_WORK_QUEUE_FILTER_PARAM,
  type KfzWorkQueueFilter,
} from '@/features/inbox/lib/kfz-work-queue'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export { INBOX_WORK_QUEUE_FILTER_PARAM }

export const INBOX_WORK_QUEUE_TIMEZONE = 'Europe/Berlin' as const

export const INBOX_WORK_QUEUE_NAV_LABEL = 'Arbeitsschlange' as const

export const INBOX_WORK_QUEUE_FILTERS = [
  'all',
  'newly_received',
  'never_contacted',
  'follow_up',
  'in_review',
  'handled',
] as const

export type InboxWorkQueueFilter = (typeof INBOX_WORK_QUEUE_FILTERS)[number]

export type InboxWorkQueueStatus =
  | 'newly_received'
  | 'in_review'
  | 'follow_up'
  | 'handled'

export const INBOX_WORK_QUEUE_TIME_GROUPS = ['older', 'yesterday', 'today'] as const

export type InboxWorkQueueTimeGroup = (typeof INBOX_WORK_QUEUE_TIME_GROUPS)[number]

export const INBOX_WORK_QUEUE_FILTER_LABELS: Record<InboxWorkQueueFilter, string> = {
  all: 'Alle',
  newly_received: 'Neu eingegangen',
  never_contacted: 'Noch nicht kontaktiert',
  follow_up: 'Rückfrage nötig',
  in_review: 'In Prüfung',
  handled: 'Erledigt',
}

export const INBOX_WORK_QUEUE_STATUS_LABELS: Record<InboxWorkQueueStatus, string> = {
  newly_received: 'Neu eingegangen',
  in_review: 'In Prüfung',
  follow_up: 'Rückfrage nötig',
  handled: 'Erledigt',
}

export const INBOX_WORK_QUEUE_TIME_GROUP_LABELS: Record<InboxWorkQueueTimeGroup, string> = {
  today: 'Heute',
  yesterday: 'Gestern',
  older: 'Älter',
}

export const INBOX_WORK_QUEUE_CONTACTED_LABEL = 'Kontaktiert' as const

export const INBOX_WORK_QUEUE_NEVER_CONTACTED_LABEL = 'Noch nicht kontaktiert' as const

export const INBOX_WORK_QUEUE_NO_ACTION_LABEL = 'Keine Mitarbeiteraktion' as const

export const INBOX_WORK_QUEUE_SORT_NOTE =
  'Offene, nie kontaktierte Eingänge stehen zuerst. Tagesgruppen folgen Älter → Gestern → Heute in Europe/Berlin, damit ältere unberührte Eingänge nicht unter heutigen verschwinden.'

export const INBOX_WORK_QUEUE_TIMEZONE_NOTE =
  'Eingangszeiten und Tagesgrenzen nutzen Europe/Berlin — die bestehende Inbox-Konvention.'

export type InboxWorkQueueCounts = Record<
  Exclude<InboxWorkQueueFilter, 'all'>,
  number
>

export type InboxWorkQueueFacts = {
  receivedAt: string
  lastHumanActionAt: string | null
  lastHumanActionLabel: string
  lastHumanActionRecorded: boolean
  preferredReplyChannel: string | null
  preferredReplyChannelLabel: string | null
  explicitStatus: InboxWorkQueueStatus
  explicitStatusLabel: string
  missingInformation: boolean
  missingCount: number
  hasContactedHistoryEvent: boolean
  contactedLabel: typeof INBOX_WORK_QUEUE_CONTACTED_LABEL | typeof INBOX_WORK_QUEUE_NEVER_CONTACTED_LABEL
  timeGroup: InboxWorkQueueTimeGroup
  timeGroupLabel: string
  primaryNextActionLabel: string
}

function inboxReceivedAt(item: Pick<InboxItem, 'received_at' | 'created_at'>): string {
  return item.received_at?.trim() || item.created_at
}

function isInboxWorkQueueFilter(value: string): value is InboxWorkQueueFilter {
  return (INBOX_WORK_QUEUE_FILTERS as readonly string[]).includes(value)
}

function formatBerlinDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: INBOX_WORK_QUEUE_TIMEZONE,
  }).format(typeof value === 'string' ? new Date(value) : value)
}

function shiftBerlinCalendarDay(now: Date, dayOffset: number): Date {
  const shifted = new Date(now)
  shifted.setDate(shifted.getDate() + dayOffset)
  return shifted
}

export function parseInboxWorkQueueFilter(
  value: string | null | undefined,
): InboxWorkQueueFilter {
  if (!value) {
    return 'all'
  }

  const trimmed = value.trim()
  return isInboxWorkQueueFilter(trimmed) ? trimmed : 'all'
}

export function emptyInboxWorkQueueCounts(): InboxWorkQueueCounts {
  return {
    newly_received: 0,
    never_contacted: 0,
    follow_up: 0,
    in_review: 0,
    handled: 0,
  }
}

export function sumInboxWorkQueueCounts(counts: InboxWorkQueueCounts): number {
  return (
    counts.newly_received +
    counts.never_contacted +
    counts.follow_up +
    counts.in_review +
    counts.handled
  )
}

export function formatInboxWorkQueueMeta(counts: InboxWorkQueueCounts): string | null {
  if (sumInboxWorkQueueCounts(counts) === 0) {
    return null
  }

  return (['newly_received', 'never_contacted', 'follow_up', 'in_review', 'handled'] as const)
    .map((filter) => `${INBOX_WORK_QUEUE_FILTER_LABELS[filter]} ${counts[filter]}`)
    .join(' · ')
}

export function inboxWorkQueueTimeGroup(
  receivedAt: string,
  now: Date = new Date(),
): InboxWorkQueueTimeGroup {
  const receivedKey = formatBerlinDateKey(receivedAt)
  const todayKey = formatBerlinDateKey(now)

  if (receivedKey === todayKey) {
    return 'today'
  }

  const yesterdayKey = formatBerlinDateKey(shiftBerlinCalendarDay(now, -1))
  if (receivedKey === yesterdayKey) {
    return 'yesterday'
  }

  return 'older'
}

export function hasExplicitContactedHistoryEvent(
  item: Pick<InboxItem, 'content'>,
): boolean {
  return hasKfzContactedNote(item.content)
}

function hasEmployeeWork(
  item: Pick<InboxItem, 'content' | 'processed_at'>,
  linkedTaskId: string | null,
): boolean {
  return (
    !isInboxItemUnprocessed(item) ||
    Boolean(linkedTaskId) ||
    hasInternalInboxNote(item.content) ||
    hasKfzReviewStartedNote(item.content) ||
    hasKfzResponseDraft(item.content)
  )
}

export function resolveInboxWorkQueueStatus(
  item: Pick<InboxItem, 'content' | 'processed_at'>,
  linkedTaskId: string | null = null,
): InboxWorkQueueStatus {
  if (!isInboxItemUnprocessed(item)) {
    return 'handled'
  }

  if (hasKfzFollowUpNote(item.content)) {
    return 'follow_up'
  }

  if (resolveKfzTriagePhase(item, linkedTaskId) === 'in_review' || hasEmployeeWork(item, linkedTaskId)) {
    return 'in_review'
  }

  return 'newly_received'
}

export function resolvePreferredReplyChannelLabel(
  item: Pick<
    InboxItem,
    'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'sender' | 'origin'
  >,
): { channel: string | null; label: string | null } {
  const review = presentKfzWebsiteInboxItem(item)
  const channel = review?.preferredChannel ?? null
  if (!channel) {
    return { channel: null, label: null }
  }

  return {
    channel,
    label: labelKfzPreferredChannel(channel),
  }
}

export function resolveLastHumanAction(
  item: Pick<
    InboxItem,
    'id' | 'content' | 'processed_at' | 'received_at' | 'created_at' | 'inbound_metadata'
  >,
  options?: {
    linkedTaskId?: string | null
    allowLocalFixtureFacts?: boolean
  },
): {
  at: string | null
  label: string
  recorded: boolean
} {
  const history = presentInboxManualReviewHistory(item, {
    linkedTaskId: options?.linkedTaskId ?? null,
    allowLocalFixtureFacts: options?.allowLocalFixtureFacts === true,
  })
  const employeeEvents = history.events.filter((event) => event.layer === 'employee')
  if (employeeEvents.length === 0) {
    return {
      at: null,
      label: INBOX_WORK_QUEUE_NO_ACTION_LABEL,
      recorded: false,
    }
  }

  const recorded = employeeEvents
    .filter((event) => event.timestampRecorded && event.occurredAt)
    .sort((left, right) => (right.occurredAt ?? '').localeCompare(left.occurredAt ?? ''))

  const latest = recorded[0]
  if (latest?.occurredAt) {
    return {
      at: latest.occurredAt,
      label: latest.occurredAtLabel,
      recorded: true,
    }
  }

  return {
    at: null,
    label: INBOX_HISTORY_NO_TIMESTAMP_LABEL,
    recorded: false,
  }
}

function resolvePrimaryNextAction(input: {
  status: InboxWorkQueueStatus
  hasContactedHistoryEvent: boolean
}): string {
  if (input.status === 'handled') {
    return 'Verlauf prüfen'
  }
  if (input.status === 'follow_up') {
    return 'Rückfrage intern klären'
  }
  if (!input.hasContactedHistoryEvent) {
    return 'Anfrage öffnen'
  }
  if (input.status === 'in_review') {
    return 'Prüfung fortsetzen'
  }
  return 'Anfrage öffnen'
}

export function presentInboxWorkQueueFacts(
  item: InboxItem,
  options?: {
    linkedTaskId?: string | null
    now?: Date
    allowLocalFixtureFacts?: boolean
  },
): InboxWorkQueueFacts {
  const linkedTaskId = options?.linkedTaskId ?? null
  const now = options?.now ?? new Date()
  const receivedAt = inboxReceivedAt(item)
  const timeGroup = inboxWorkQueueTimeGroup(receivedAt, now)
  const explicitStatus = resolveInboxWorkQueueStatus(item, linkedTaskId)
  const hasContactedHistoryEvent = hasExplicitContactedHistoryEvent(item)
  const lastHumanAction = resolveLastHumanAction(item, {
    linkedTaskId,
    allowLocalFixtureFacts: options?.allowLocalFixtureFacts === true,
  })
  const preferred = resolvePreferredReplyChannelLabel(item)
  const kfzReview = presentKfzWebsiteInboxItem(item, { linkedTaskId })
  const missingCount = kfzReview?.missingCount ?? 0

  return {
    receivedAt,
    lastHumanActionAt: lastHumanAction.at,
    lastHumanActionLabel: lastHumanAction.label,
    lastHumanActionRecorded: lastHumanAction.recorded,
    preferredReplyChannel: preferred.channel,
    preferredReplyChannelLabel: preferred.label,
    explicitStatus,
    explicitStatusLabel: INBOX_WORK_QUEUE_STATUS_LABELS[explicitStatus],
    missingInformation: missingCount > 0,
    missingCount,
    hasContactedHistoryEvent,
    contactedLabel: hasContactedHistoryEvent
      ? INBOX_WORK_QUEUE_CONTACTED_LABEL
      : INBOX_WORK_QUEUE_NEVER_CONTACTED_LABEL,
    timeGroup,
    timeGroupLabel: INBOX_WORK_QUEUE_TIME_GROUP_LABELS[timeGroup],
    primaryNextActionLabel: resolvePrimaryNextAction({
      status: explicitStatus,
      hasContactedHistoryEvent,
    }),
  }
}

export function matchesInboxWorkQueueFilter(
  item: InboxItem,
  filter: InboxWorkQueueFilter,
  options?: {
    linkedTaskId?: string | null
    now?: Date
  },
): boolean {
  if (filter === 'all') {
    return true
  }

  const linkedTaskId = options?.linkedTaskId ?? null
  const status = resolveInboxWorkQueueStatus(item, linkedTaskId)

  if (filter === 'newly_received') {
    return status === 'newly_received'
  }
  if (filter === 'never_contacted') {
    return !hasExplicitContactedHistoryEvent(item) && isInboxItemUnprocessed(item)
  }
  if (filter === 'follow_up') {
    return status === 'follow_up'
  }
  if (filter === 'in_review') {
    return status === 'in_review'
  }
  return status === 'handled'
}

export function filterInboxItemsByWorkQueue<T extends InboxItem>(
  items: T[],
  filter: InboxWorkQueueFilter,
  options?: {
    taskRelationsByItemId?: Record<string, string>
    now?: Date
  },
): T[] {
  if (filter === 'all') {
    return items
  }

  const taskRelationsByItemId = options?.taskRelationsByItemId ?? {}
  return items.filter((item) =>
    matchesInboxWorkQueueFilter(item, filter, {
      linkedTaskId: taskRelationsByItemId[item.id] ?? null,
      now: options?.now,
    }),
  )
}

export function countInboxWorkQueue(
  items: InboxItem[],
  options?: {
    taskRelationsByItemId?: Record<string, string>
    now?: Date
  },
): InboxWorkQueueCounts {
  const counts = emptyInboxWorkQueueCounts()
  const taskRelationsByItemId = options?.taskRelationsByItemId ?? {}

  for (const item of items) {
    const linkedTaskId = taskRelationsByItemId[item.id] ?? null
    const matchOptions = { linkedTaskId, now: options?.now }
    if (matchesInboxWorkQueueFilter(item, 'newly_received', matchOptions)) {
      counts.newly_received += 1
    }
    if (matchesInboxWorkQueueFilter(item, 'never_contacted', matchOptions)) {
      counts.never_contacted += 1
    }
    if (matchesInboxWorkQueueFilter(item, 'follow_up', matchOptions)) {
      counts.follow_up += 1
    }
    if (matchesInboxWorkQueueFilter(item, 'in_review', matchOptions)) {
      counts.in_review += 1
    }
    if (matchesInboxWorkQueueFilter(item, 'handled', matchOptions)) {
      counts.handled += 1
    }
  }

  return counts
}

export function compareInboxWorkQueueItems(
  left: InboxItem,
  right: InboxItem,
): number {
  const leftHandled = isInboxItemUnprocessed(left) ? 0 : 1
  const rightHandled = isInboxItemUnprocessed(right) ? 0 : 1
  if (leftHandled !== rightHandled) {
    return leftHandled - rightHandled
  }

  const leftContacted = hasExplicitContactedHistoryEvent(left) ? 1 : 0
  const rightContacted = hasExplicitContactedHistoryEvent(right) ? 1 : 0
  if (leftContacted !== rightContacted) {
    return leftContacted - rightContacted
  }

  const leftReceived = inboxReceivedAt(left)
  const rightReceived = inboxReceivedAt(right)
  if (leftReceived !== rightReceived) {
    return leftReceived.localeCompare(rightReceived)
  }

  return left.id.localeCompare(right.id)
}

export function sortInboxWorkQueueItems<T extends InboxItem>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => compareInboxWorkQueueItems(left, right))
}

export function groupInboxWorkQueueItems<T extends InboxItem>(
  items: T[],
  now: Date = new Date(),
): Array<{ group: InboxWorkQueueTimeGroup; label: string; items: T[] }> {
  const buckets: Record<InboxWorkQueueTimeGroup, T[]> = {
    older: [],
    yesterday: [],
    today: [],
  }

  for (const item of items) {
    buckets[inboxWorkQueueTimeGroup(inboxReceivedAt(item), now)].push(item)
  }

  return INBOX_WORK_QUEUE_TIME_GROUPS.filter((group) => buckets[group].length > 0).map((group) => ({
    group,
    label: INBOX_WORK_QUEUE_TIME_GROUP_LABELS[group],
    items: buckets[group],
  }))
}

export function buildInboxWorkQueueFilterHrefs(options?: {
  selectedItemId?: string | null
  selectedItem?: InboxItem | null
  linkedTaskId?: string | null
  phase?: KfzWorkQueueFilter | null
  source?: string | null
  basePath?: string | null
  now?: Date
}): Record<InboxWorkQueueFilter, string> {
  const hrefs = {} as Record<InboxWorkQueueFilter, string>

  for (const filter of INBOX_WORK_QUEUE_FILTERS) {
    const keepItem =
      Boolean(options?.selectedItemId) &&
      (filter === 'all' ||
        (options?.selectedItem
          ? matchesInboxWorkQueueFilter(options.selectedItem, filter, {
              linkedTaskId: options.linkedTaskId ?? null,
              now: options.now,
            })
          : false))
    hrefs[filter] = buildInboxHref({
      queue: filter,
      phase: options?.phase,
      source: options?.source,
      itemId: keepItem ? options?.selectedItemId : null,
      basePath: options?.basePath,
    })
  }

  return hrefs
}

