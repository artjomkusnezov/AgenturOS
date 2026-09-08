/**
 * Factual manual-review history for one inbox working copy.
 * Reuses received time, notes, draft, linked task and processed_at.
 * Does not invent actors or timestamps.
 */

import { formatInboxDateTime } from '@/features/inbox/lib/inbox-status'
import {
  hasKfzReviewStartedNote,
  KFZ_REVIEW_STARTED_NOTE,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { parseInboxItemView, type InboxItemView } from '@/features/inbox/lib/inbox-item-view'
import {
  buildInboxHref,
  type KfzWorkQueueFilter,
} from '@/features/inbox/lib/kfz-work-queue'
import {
  hasKfzResponseDraft,
  readKfzResponseDraft,
  splitInboxWorkingCopy,
} from '@/features/inbox/lib/kfz-response-draft'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const LOCAL_REVIEW_HISTORY_FIXTURE_KEY = 'localReviewHistory' as const

export const INBOX_HISTORY_HEADING = 'Prüfungsverlauf' as const

export const INBOX_HISTORY_OPEN_LABEL = 'Verlauf öffnen' as const

export const INBOX_HISTORY_RETURN_LABEL = 'Zur Arbeitsfläche' as const

export const INBOX_HISTORY_NO_TIMESTAMP_LABEL = 'Zeitpunkt nicht gespeichert' as const

export const INBOX_HISTORY_NO_ACTOR_LABEL = 'Akteur nicht gespeichert' as const

export const INBOX_HISTORY_SOURCE_LAYER_LABEL = 'Quelltatsache' as const

export const INBOX_HISTORY_EMPLOYEE_LAYER_LABEL = 'Mitarbeiteraktion' as const

export const INBOX_HISTORY_AI_EXCLUSION_LABEL =
  'KI-Vorschläge bleiben getrennt und gehören nicht in diese Chronik.' as const

export const INBOX_HISTORY_LIMITATION =
  'Die Arbeitskopie speichert keine eigenen Zeitpunkte oder Akteure für Prüfungsstart, Notiz, Entwurf oder Folgeaufgabe. Zeitangaben erscheinen nur bei Eingang (received_at/created_at), manuellem Abschluss (processed_at) oder dokumentierten lokalen Fixture-Tatsachen.' as const

export const INBOX_HISTORY_KIND_LABELS = {
  received: 'Eingegangen',
  review_started: 'Prüfung begonnen',
  note_saved: 'Notiz gespeichert',
  internal_task_created: 'Interne Aufgabe angelegt',
  draft_saved: 'Entwurf gespeichert',
  manually_completed: 'Manuell erledigt',
} as const

export type InboxHistoryEventKind = keyof typeof INBOX_HISTORY_KIND_LABELS

export type InboxHistoryLayer = 'source' | 'employee'

export type LocalReviewHistoryFixtureFacts = {
  documentedLimitation: typeof INBOX_HISTORY_LIMITATION
  reviewStartedAt?: string
  noteSavedAtByIndex?: string[]
  draftSavedAt?: string
  taskCreatedAt?: string
}

export type InboxHistoryEvent = {
  id: string
  kind: InboxHistoryEventKind
  layer: InboxHistoryLayer
  layerLabel: typeof INBOX_HISTORY_SOURCE_LAYER_LABEL | typeof INBOX_HISTORY_EMPLOYEE_LAYER_LABEL
  label: string
  detail: string
  occurredAt: string | null
  occurredAtLabel: string
  actorLabel: null
  actorLimitation: typeof INBOX_HISTORY_NO_ACTOR_LABEL
  timestampRecorded: boolean
}

export type InboxManualReviewHistory = {
  itemId: string
  events: InboxHistoryEvent[]
  sourceEventCount: number
  employeeEventCount: number
  limitation: typeof INBOX_HISTORY_LIMITATION
  aiExclusionLabel: typeof INBOX_HISTORY_AI_EXCLUSION_LABEL
  includesAiSuggestion: false
  noExternalSideEffect: true
  fixtureFactsUsed: boolean
  activeView: InboxItemView
  historyHref: string
  workHref: string
}

const WORKFLOW_ORDER: readonly InboxHistoryEventKind[] = [
  'received',
  'review_started',
  'note_saved',
  'draft_saved',
  'internal_task_created',
  'manually_completed',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return trimmed
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => asIsoTimestamp(entry))
    .filter((entry): entry is string => Boolean(entry))
}

export function readLocalReviewHistoryFixtureFacts(
  metadata: InboxItem['inbound_metadata'],
): LocalReviewHistoryFixtureFacts | null {
  if (!isRecord(metadata)) {
    return null
  }

  const raw = metadata[LOCAL_REVIEW_HISTORY_FIXTURE_KEY]
  if (!isRecord(raw)) {
    return null
  }

  const noteSavedAtByIndex = readStringArray(raw.noteSavedAtByIndex)
  const facts: LocalReviewHistoryFixtureFacts = {
    documentedLimitation: INBOX_HISTORY_LIMITATION,
  }

  const reviewStartedAt = asIsoTimestamp(raw.reviewStartedAt)
  if (reviewStartedAt) {
    facts.reviewStartedAt = reviewStartedAt
  }

  if (noteSavedAtByIndex.length > 0) {
    facts.noteSavedAtByIndex = noteSavedAtByIndex
  }

  const draftSavedAt = asIsoTimestamp(raw.draftSavedAt)
  if (draftSavedAt) {
    facts.draftSavedAt = draftSavedAt
  }

  const taskCreatedAt = asIsoTimestamp(raw.taskCreatedAt)
  if (taskCreatedAt) {
    facts.taskCreatedAt = taskCreatedAt
  }

  return facts.reviewStartedAt ||
    facts.noteSavedAtByIndex ||
    facts.draftSavedAt ||
    facts.taskCreatedAt
    ? facts
    : null
}

function receivedAt(item: Pick<InboxItem, 'received_at' | 'created_at'>): string {
  return item.received_at?.trim() || item.created_at
}

function listOperatorNoteLines(content: string): string[] {
  return splitInboxWorkingCopy(content)
    .notes.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function isReviewStartedNote(line: string): boolean {
  return line === KFZ_REVIEW_STARTED_NOTE
}

function layerLabel(
  layer: InboxHistoryLayer,
): typeof INBOX_HISTORY_SOURCE_LAYER_LABEL | typeof INBOX_HISTORY_EMPLOYEE_LAYER_LABEL {
  return layer === 'source'
    ? INBOX_HISTORY_SOURCE_LAYER_LABEL
    : INBOX_HISTORY_EMPLOYEE_LAYER_LABEL
}

function presentOccurredAt(occurredAt: string | null): {
  occurredAt: string | null
  occurredAtLabel: string
  timestampRecorded: boolean
} {
  if (!occurredAt) {
    return {
      occurredAt: null,
      occurredAtLabel: INBOX_HISTORY_NO_TIMESTAMP_LABEL,
      timestampRecorded: false,
    }
  }

  return {
    occurredAt,
    occurredAtLabel: formatInboxDateTime(occurredAt),
    timestampRecorded: true,
  }
}

function createEvent(input: {
  id: string
  kind: InboxHistoryEventKind
  layer: InboxHistoryLayer
  detail: string
  occurredAt: string | null
}): InboxHistoryEvent {
  return {
    id: input.id,
    kind: input.kind,
    layer: input.layer,
    layerLabel: layerLabel(input.layer),
    label: INBOX_HISTORY_KIND_LABELS[input.kind],
    detail: input.detail,
    actorLabel: null,
    actorLimitation: INBOX_HISTORY_NO_ACTOR_LABEL,
    ...presentOccurredAt(input.occurredAt),
  }
}

function workflowIndex(kind: InboxHistoryEventKind): number {
  return WORKFLOW_ORDER.indexOf(kind)
}

function sortHistoryEvents(events: InboxHistoryEvent[]): InboxHistoryEvent[] {
  return [...events].sort((left, right) => {
    if (left.occurredAt && right.occurredAt && left.occurredAt !== right.occurredAt) {
      return left.occurredAt.localeCompare(right.occurredAt)
    }

    const byWorkflow = workflowIndex(left.kind) - workflowIndex(right.kind)
    if (byWorkflow !== 0) {
      return byWorkflow
    }

    return left.id.localeCompare(right.id)
  })
}

export function presentInboxManualReviewHistory(
  item: Pick<
    InboxItem,
    'id' | 'content' | 'processed_at' | 'received_at' | 'created_at' | 'inbound_metadata'
  >,
  options?: {
    linkedTaskId?: string | null
    phase?: KfzWorkQueueFilter | null
    source?: InboxSourceFilter | null
    view?: string | null
    basePath?: string | null
    allowLocalFixtureFacts?: boolean
  },
): InboxManualReviewHistory {
  const linkedTaskId = options?.linkedTaskId?.trim() || null
  const fixtureFacts =
    options?.allowLocalFixtureFacts === true
      ? readLocalReviewHistoryFixtureFacts(item.inbound_metadata)
      : null
  const receivedAtValue = receivedAt(item)
  const extraNotes = listOperatorNoteLines(item.content).filter(
    (line) => !isReviewStartedNote(line),
  )
  const draft = readKfzResponseDraft(item.content)
  const events: InboxHistoryEvent[] = [
    createEvent({
      id: 'received',
      kind: 'received',
      layer: 'source',
      detail: 'Eingang als Arbeitskopie übernommen. Quelltatsache, keine Mitarbeiteraktion.',
      occurredAt: receivedAtValue,
    }),
  ]

  if (hasKfzReviewStartedNote(item.content)) {
    events.push(
      createEvent({
        id: 'review_started',
        kind: 'review_started',
        layer: 'employee',
        detail: KFZ_REVIEW_STARTED_NOTE,
        occurredAt: fixtureFacts?.reviewStartedAt ?? null,
      }),
    )
  }

  extraNotes.forEach((note, index) => {
    events.push(
      createEvent({
        id: `note_saved:${index}`,
        kind: 'note_saved',
        layer: 'employee',
        detail: note,
        occurredAt: fixtureFacts?.noteSavedAtByIndex?.[index] ?? null,
      }),
    )
  })

  if (hasKfzResponseDraft(item.content) && draft.length > 0) {
    events.push(
      createEvent({
        id: 'draft_saved',
        kind: 'draft_saved',
        layer: 'employee',
        detail: 'Interner Antwortentwurf gespeichert. Nichts wurde gesendet.',
        occurredAt: fixtureFacts?.draftSavedAt ?? null,
      }),
    )
  }

  if (linkedTaskId) {
    events.push(
      createEvent({
        id: 'internal_task_created',
        kind: 'internal_task_created',
        layer: 'employee',
        detail: 'Interne Folgeaufgabe ist mit diesem Eingang verknüpft. Kein Kundenkontakt.',
        occurredAt: fixtureFacts?.taskCreatedAt ?? null,
      }),
    )
  }

  if (item.processed_at?.trim()) {
    events.push(
      createEvent({
        id: 'manually_completed',
        kind: 'manually_completed',
        layer: 'employee',
        detail: 'Manuell als bearbeitet markiert. Nichts wurde automatisch gesendet.',
        occurredAt: item.processed_at,
      }),
    )
  }

  const sorted = sortHistoryEvents(events)
  const hrefOptions = {
    itemId: item.id,
    phase: options?.phase ?? 'all',
    source: options?.source ?? 'all',
    basePath: options?.basePath,
  }

  return {
    itemId: item.id,
    events: sorted,
    sourceEventCount: sorted.filter((event) => event.layer === 'source').length,
    employeeEventCount: sorted.filter((event) => event.layer === 'employee').length,
    limitation: INBOX_HISTORY_LIMITATION,
    aiExclusionLabel: INBOX_HISTORY_AI_EXCLUSION_LABEL,
    includesAiSuggestion: false,
    noExternalSideEffect: true,
    fixtureFactsUsed: fixtureFacts !== null,
    activeView: parseInboxItemView(options?.view),
    historyHref: buildInboxHref({ ...hrefOptions, view: 'history' }),
    workHref: buildInboxHref({ ...hrefOptions, view: 'work' }),
  }
}
