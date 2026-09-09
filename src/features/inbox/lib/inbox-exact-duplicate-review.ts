/**
 * Exact normalized duplicate hints on an inbound review card.
 * Phone, email, vehicle registration and explicit reference IDs only.
 * Never name-only, fuzzy, AI, enrichment, merge or automatic contact.
 */

import { formatInboundSenderLabel } from '@/features/inbound/lib/inbound-item-utils'
import type { InboundSenderRecord } from '@/features/inbound/types/inbound-item'
import { getInboxListTitle, truncateInboxContentPreview } from '@/features/inbox/lib/format-inbox-content'
import type { InboxWorkQueueFilter } from '@/features/inbox/lib/inbox-factual-work-queue'
import { getInboxItemSourceLabel } from '@/features/inbox/lib/inbox-source'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import { formatInboxDateTime, formatInboxListDate } from '@/features/inbox/lib/inbox-status'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  buildInboxHref,
  presentInboxStatusChip,
  type KfzWorkQueueFilter,
} from '@/features/inbox/lib/kfz-work-queue'
import { readInboxSourceContent } from '@/features/inbox/lib/kfz-response-draft'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

export const INBOX_DUPLICATE_REVIEW_METADATA_KEY = 'duplicateReview' as const

export const INBOX_DUPLICATE_SECTION_LABEL = 'Möglicherweise bereits vorhanden' as const

export const INBOX_DUPLICATE_RELATED_SECTION_LABEL = 'Zusammengehörig' as const

export const INBOX_DUPLICATE_HINT =
  'Nur exakte Übereinstimmung sichtbarer Angaben — nichts wird automatisch zusammengeführt, geschlossen oder geschrieben.' as const

export const INBOX_DUPLICATE_NO_AUTO_DECISION =
  'Keine automatische Entscheidung bei fehlenden oder mehrdeutigen Angaben.' as const

export const INBOX_DUPLICATE_DISMISS_LABEL = 'Kein Duplikat' as const

export const INBOX_DUPLICATE_RELATE_LABEL = 'Als zusammengehörig markieren' as const

export const INBOX_DUPLICATE_UNLINK_LABEL = 'Zusammengehörigkeit entfernen' as const

export const INBOX_DUPLICATE_OPEN_LABEL = 'Öffnen' as const

export const INBOX_DUPLICATE_RETURN_HINT =
  'Öffnen behält Filter und Suche. Zurück zur Liste oder zur ursprünglichen Anfrage ändert keinen Status.' as const

export const INBOX_DUPLICATE_FIELD_IDS = ['phone', 'email', 'plate', 'reference'] as const

export type InboxDuplicateFieldId = (typeof INBOX_DUPLICATE_FIELD_IDS)[number]

export const INBOX_DUPLICATE_FIELD_LABELS: Record<InboxDuplicateFieldId, string> = {
  phone: 'Telefon',
  email: 'E-Mail',
  plate: 'Kennzeichen',
  reference: 'Referenz',
}

export const INBOX_DUPLICATE_HISTORY_KIND_LABELS = {
  duplicate_dismissed: 'Kein Duplikat',
  related_marked: 'Als zusammengehörig markiert',
  related_removed: 'Zusammengehörigkeit entfernt',
} as const

export type InboxDuplicateHistoryKind = keyof typeof INBOX_DUPLICATE_HISTORY_KIND_LABELS

export type InboxDuplicateDecisionType = 'dismiss' | 'relate' | 'unlink'

export type InboxDuplicateIdentityToken = {
  fieldId: InboxDuplicateFieldId
  normalized: string
  display: string
}

export type InboxDuplicateMatch = {
  fieldId: InboxDuplicateFieldId
  fieldLabel: string
  displayValue: string
  explanation: string
}

export type InboxDuplicateCandidate = {
  itemId: string
  headline: string
  sourceLabel: string
  receivedAt: string
  receivedAtLabel: string
  receivedAtLongLabel: string
  statusLabel: string
  summary: string
  matches: InboxDuplicateMatch[]
  matchFieldIds: InboxDuplicateFieldId[]
  href: string
  returnHref: string
}

export type InboxDuplicateRelatedItem = InboxDuplicateCandidate & {
  relatedAt: string | null
  relatedAtLabel: string | null
}

export type InboxDuplicateReview = {
  itemId: string
  pending: InboxDuplicateCandidate[]
  related: InboxDuplicateRelatedItem[]
  hasPending: boolean
  hasRelated: boolean
  visible: boolean
  noAutomaticDecision: true
  noExternalSideEffect: true
}

export type InboxDuplicateLink = {
  itemId: string
  fieldIds: InboxDuplicateFieldId[]
  at: string | null
}

export type InboxDuplicateHistoryEntry = {
  id: string
  kind: InboxDuplicateHistoryKind
  otherItemId: string
  fieldIds: InboxDuplicateFieldId[]
  at: string | null
}

export type InboxDuplicateReviewRecord = {
  related: InboxDuplicateLink[]
  dismissed: InboxDuplicateLink[]
  events: InboxDuplicateHistoryEntry[]
}

export type InboxDuplicateDecisionCommand =
  | {
      type: 'dismiss'
      otherItemId: string
      fieldIds: InboxDuplicateFieldId[]
      at?: string
    }
  | {
      type: 'relate'
      otherItemId: string
      fieldIds: InboxDuplicateFieldId[]
      at?: string
    }
  | {
      type: 'unlink'
      otherItemId: string
      at?: string
    }

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
const PHONE_DIGIT_MIN = 7
const REFERENCE_MIN_LENGTH = 4

const GERMAN_PLATE_PATTERN =
  /(?<![A-ZÄÖÜ0-9])([A-ZÄÖÜ]{1,3})[-\s]([A-Z]{1,2})[-\s]?(\d{1,4}[EH]?)(?![A-ZÄÖÜ0-9])/gi

const GERMAN_PLATE_COMPACT_PATTERN =
  /^(?:([A-ZÄÖÜ]{1,3})-([A-Z]{1,2})[-\s]?(\d{1,4}[EH]?)|([A-ZÄÖÜ]{1,3})([A-Z]{1,2})(\d{1,4}[EH]?))$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNullableString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asText = String(value).trim()
    return asText.length > 0 ? asText : null
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cloneRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {}
}

function readParty(
  value: InboxItem['origin'] | InboxItem['sender'],
): { name: string | null; address: string | null; addressKind: string | null } {
  if (!isRecord(value)) {
    return { name: null, address: null, addressKind: null }
  }

  return {
    name: formatInboundSenderLabel(value as InboundSenderRecord),
    address: asNullableString(value.address),
    addressKind: asNullableString(value.addressKind),
  }
}

function pushToken(
  tokens: InboxDuplicateIdentityToken[],
  fieldId: InboxDuplicateFieldId,
  normalized: string,
  display: string,
) {
  if (!normalized || !display) {
    return
  }
  if (tokens.some((token) => token.fieldId === fieldId && token.normalized === normalized)) {
    return
  }
  tokens.push({ fieldId, normalized, display })
}

export function normalizeInboxDuplicateEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
    return null
  }
  return trimmed
}

function normalizeDuplicateText(value: string): string {
  return value.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function normalizeDuplicatePhoneDigits(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const plus = trimmed.startsWith('+')
  let digits = trimmed.replace(/\D/g, '')
  if (!digits) {
    return ''
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (!plus && digits.startsWith('0')) {
    digits = `49${digits.slice(1)}`
  }

  return digits
}

export function normalizeInboxDuplicatePhone(value: string): string | null {
  const digits = normalizeDuplicatePhoneDigits(value)
  if (digits.length < PHONE_DIGIT_MIN || digits.length > 15) {
    return null
  }
  return digits
}

export function normalizeInboxDuplicateReference(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length < REFERENCE_MIN_LENGTH) {
    return null
  }
  return normalizeDuplicateText(normalized)
}

export function normalizeInboxDuplicatePlate(value: string): string | null {
  const plates = extractInboxDuplicatePlates(value)
  return plates.length === 1 ? plates[0]!.normalized : null
}

export function extractInboxDuplicatePlates(value: string): InboxDuplicateIdentityToken[] {
  const text = value.normalize('NFC').toUpperCase()
  if (!text.trim()) {
    return []
  }

  const tokens: InboxDuplicateIdentityToken[] = []
  const compact = text.replace(/[\s-]/g, '')
  const compactMatch = GERMAN_PLATE_COMPACT_PATTERN.exec(text.trim()) ?? GERMAN_PLATE_COMPACT_PATTERN.exec(compact)
  if (compactMatch && compactMatch[0] === text.trim()) {
    const district = compactMatch[1] ?? compactMatch[4] ?? ''
    const letters = compactMatch[2] ?? compactMatch[5] ?? ''
    const number = compactMatch[3] ?? compactMatch[6] ?? ''
    const normalized = `${district}${letters}${number}`
    if (normalized.length >= 4) {
      pushToken(tokens, 'plate', normalized, `${district}-${letters} ${number}`)
      return tokens
    }
  }

  const pattern = new RegExp(GERMAN_PLATE_PATTERN.source, 'gi')
  let match: RegExpExecArray | null = pattern.exec(text)
  while (match) {
    const district = match[1] ?? ''
    const letters = match[2] ?? ''
    const number = match[3] ?? ''
    const normalized = `${district}${letters}${number}`
    const display = `${district}-${letters} ${number}`
    if (normalized.length >= 4) {
      pushToken(tokens, 'plate', normalized, display)
    }
    match = pattern.exec(text)
  }

  return tokens
}

function readInquiry(metadata: InboxItem['inbound_metadata']): Record<string, unknown> | null {
  if (!isRecord(metadata)) {
    return null
  }
  return isRecord(metadata.inquiry) ? metadata.inquiry : null
}

function readVehicle(inquiry: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!inquiry || !isRecord(inquiry.vehicle)) {
    return null
  }
  return inquiry.vehicle
}

function collectContactTokens(
  tokens: InboxDuplicateIdentityToken[],
  address: string | null,
  addressKind: string | null,
) {
  if (!address) {
    return
  }

  if (addressKind === 'email' || address.includes('@')) {
    const email = normalizeInboxDuplicateEmail(address)
    if (email) {
      pushToken(tokens, 'email', email, address.trim())
    }
    return
  }

  if (addressKind === 'phone' || /\d{6,}/.test(address)) {
    const phone = normalizeInboxDuplicatePhone(address)
    if (phone) {
      pushToken(tokens, 'phone', phone, address.trim())
    }
  }
}

function collectExplicitReference(
  tokens: InboxDuplicateIdentityToken[],
  value: string | null | undefined,
) {
  if (!value) {
    return
  }
  const normalized = normalizeInboxDuplicateReference(value)
  if (normalized) {
    pushToken(tokens, 'reference', normalized, value.trim())
  }
}

export function collectInboxExactIdentityTokens(
  item: Pick<
    InboxItem,
    | 'external_id'
    | 'inbound_metadata'
    | 'origin'
    | 'sender'
    | 'content'
    | 'channel'
    | 'title'
  >,
): InboxDuplicateIdentityToken[] {
  const tokens: InboxDuplicateIdentityToken[] = []
  const inquiry = readInquiry(item.inbound_metadata)
  const vehicle = readVehicle(inquiry)
  const origin = readParty(item.origin)
  const sender = readParty(item.sender)
  const isManual = item.channel === 'manual'

  const phone = asNullableString(inquiry?.phone)
  if (phone) {
    const normalized = normalizeInboxDuplicatePhone(phone)
    if (normalized) {
      pushToken(tokens, 'phone', normalized, phone)
    }
  }

  const email = asNullableString(inquiry?.email)
  if (email) {
    const normalized = normalizeInboxDuplicateEmail(email)
    if (normalized) {
      pushToken(tokens, 'email', normalized, email)
    }
  }

  collectContactTokens(tokens, origin.address, origin.addressKind)
  if (!isManual) {
    collectContactTokens(tokens, sender.address, sender.addressKind)
  }

  const plateFields = [
    asNullableString(vehicle?.registration),
    asNullableString(vehicle?.plate),
    asNullableString(vehicle?.licensePlate),
    asNullableString(inquiry?.licensePlate),
    asNullableString(inquiry?.registration),
  ]
  for (const plate of plateFields) {
    if (!plate) {
      continue
    }
    const extracted = extractInboxDuplicatePlates(plate)
    if (extracted.length === 1) {
      pushToken(tokens, 'plate', extracted[0]!.normalized, plate)
    } else {
      for (const token of extracted) {
        pushToken(tokens, 'plate', token.normalized, token.display)
      }
    }
  }

  const contextNotes = asNullableString(inquiry?.contextNotes)
  if (contextNotes) {
    for (const token of extractInboxDuplicatePlates(contextNotes)) {
      pushToken(tokens, 'plate', token.normalized, token.display)
    }
  }

  const sourceContent = readInboxSourceContent(item.content)
  for (const token of extractInboxDuplicatePlates(sourceContent)) {
    pushToken(tokens, 'plate', token.normalized, token.display)
  }

  collectExplicitReference(tokens, asNullableString(item.external_id))
  if (isRecord(item.inbound_metadata)) {
    collectExplicitReference(tokens, asNullableString(item.inbound_metadata.referenceId))
  }
  collectExplicitReference(tokens, asNullableString(inquiry?.referenceId))
  collectExplicitReference(tokens, asNullableString(inquiry?.externalReferenceId))

  return tokens
}

export function matchInboxExactIdentityTokens(
  left: readonly InboxDuplicateIdentityToken[],
  right: readonly InboxDuplicateIdentityToken[],
): InboxDuplicateMatch[] {
  const matches: InboxDuplicateMatch[] = []

  for (const token of left) {
    const counterpart = right.find(
      (other) => other.fieldId === token.fieldId && other.normalized === token.normalized,
    )
    if (!counterpart) {
      continue
    }
    if (matches.some((match) => match.fieldId === token.fieldId && match.displayValue === token.display)) {
      continue
    }

    const fieldLabel = INBOX_DUPLICATE_FIELD_LABELS[token.fieldId]
    const displayValue = token.display || counterpart.display
    matches.push({
      fieldId: token.fieldId,
      fieldLabel,
      displayValue,
      explanation: `Gleiche ${fieldLabel} · ${displayValue}`,
    })
  }

  return matches
}

function isDuplicateFieldId(value: string): value is InboxDuplicateFieldId {
  return (INBOX_DUPLICATE_FIELD_IDS as readonly string[]).includes(value)
}

function readFieldIds(value: unknown): InboxDuplicateFieldId[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is InboxDuplicateFieldId => typeof entry === 'string' && isDuplicateFieldId(entry))
}

function readLink(value: unknown): InboxDuplicateLink | null {
  if (!isRecord(value)) {
    return null
  }
  const itemId = asNullableString(value.itemId)
  if (!itemId || !isValidInboxItemId(itemId)) {
    return null
  }
  return {
    itemId,
    fieldIds: readFieldIds(value.fieldIds),
    at: asNullableString(value.at),
  }
}

function isDuplicateHistoryKind(value: string): value is InboxDuplicateHistoryKind {
  return value in INBOX_DUPLICATE_HISTORY_KIND_LABELS
}

function readHistoryEntry(value: unknown): InboxDuplicateHistoryEntry | null {
  if (!isRecord(value)) {
    return null
  }
  const id = asNullableString(value.id)
  const kindRaw = asNullableString(value.kind)
  const otherItemId = asNullableString(value.otherItemId)
  if (!id || !kindRaw || !isDuplicateHistoryKind(kindRaw) || !otherItemId || !isValidInboxItemId(otherItemId)) {
    return null
  }
  return {
    id,
    kind: kindRaw,
    otherItemId,
    fieldIds: readFieldIds(value.fieldIds),
    at: asNullableString(value.at),
  }
}

export function emptyInboxDuplicateReviewRecord(): InboxDuplicateReviewRecord {
  return {
    related: [],
    dismissed: [],
    events: [],
  }
}

export function readInboxDuplicateReviewRecord(
  metadata: InboxItem['inbound_metadata'],
): InboxDuplicateReviewRecord {
  if (!isRecord(metadata)) {
    return emptyInboxDuplicateReviewRecord()
  }
  const raw = metadata[INBOX_DUPLICATE_REVIEW_METADATA_KEY]
  if (!isRecord(raw)) {
    return emptyInboxDuplicateReviewRecord()
  }

  return {
    related: Array.isArray(raw.related)
      ? raw.related.map(readLink).filter((entry): entry is InboxDuplicateLink => Boolean(entry))
      : [],
    dismissed: Array.isArray(raw.dismissed)
      ? raw.dismissed.map(readLink).filter((entry): entry is InboxDuplicateLink => Boolean(entry))
      : [],
    events: Array.isArray(raw.events)
      ? raw.events
          .map(readHistoryEntry)
          .filter((entry): entry is InboxDuplicateHistoryEntry => Boolean(entry))
      : [],
  }
}

function writeDuplicateReviewRecord(
  metadata: InboxItem['inbound_metadata'],
  record: InboxDuplicateReviewRecord,
): Json {
  return {
    ...cloneRecord(metadata),
    [INBOX_DUPLICATE_REVIEW_METADATA_KEY]: {
      related: record.related,
      dismissed: record.dismissed,
      events: record.events,
    },
  } as Json
}

function upsertLink(links: InboxDuplicateLink[], next: InboxDuplicateLink): InboxDuplicateLink[] {
  const remaining = links.filter((link) => link.itemId !== next.itemId)
  return [...remaining, next]
}

function removeLink(links: InboxDuplicateLink[], itemId: string): InboxDuplicateLink[] {
  return links.filter((link) => link.itemId !== itemId)
}

function appendHistory(
  events: InboxDuplicateHistoryEntry[],
  entry: InboxDuplicateHistoryEntry,
): InboxDuplicateHistoryEntry[] {
  return [...events, entry]
}

function decisionTimestamp(at: string | undefined): string {
  if (at?.trim()) {
    return at.trim()
  }
  return new Date().toISOString()
}

function withMetadata(item: InboxItem, record: InboxDuplicateReviewRecord, updatedAt: string): InboxItem {
  return {
    ...item,
    inbound_metadata: writeDuplicateReviewRecord(item.inbound_metadata, record),
    updated_at: updatedAt,
  }
}

export function inboxDuplicateDecisionDoesNotMutate(): {
  mutated: {
    content: false
    processed: false
    task: false
    contacted: false
    status: false
    merge: false
    delete: false
    send: false
  }
  noExternalSideEffect: true
} {
  return {
    mutated: {
      content: false,
      processed: false,
      task: false,
      contacted: false,
      status: false,
      merge: false,
      delete: false,
      send: false,
    },
    noExternalSideEffect: true,
  }
}

export function applyInboxDuplicateDecision(
  current: InboxItem,
  other: InboxItem,
  command: InboxDuplicateDecisionCommand,
):
  | {
      ok: true
      current: InboxItem
      other: InboxItem
      mutated: ReturnType<typeof inboxDuplicateDecisionDoesNotMutate>['mutated']
      noExternalSideEffect: true
    }
  | { ok: false; error: string } {
  if (current.id === other.id) {
    return { ok: false, error: 'Eine Anfrage kann nicht mit sich selbst verknüpft werden.' }
  }
  if (!isValidInboxItemId(current.id) || !isValidInboxItemId(other.id)) {
    return { ok: false, error: 'Das Eingangselement ist ungültig.' }
  }
  if (command.otherItemId !== other.id) {
    return { ok: false, error: 'Die Vergleichsanfrage ist ungültig.' }
  }

  const at = decisionTimestamp(command.at)
  const currentRecord = readInboxDuplicateReviewRecord(current.inbound_metadata)
  const otherRecord = readInboxDuplicateReviewRecord(other.inbound_metadata)

  if (command.type === 'dismiss') {
    if (currentRecord.related.some((link) => link.itemId === other.id)) {
      return { ok: false, error: 'Bitte zuerst die Zusammengehörigkeit entfernen.' }
    }
    if (currentRecord.dismissed.some((link) => link.itemId === other.id)) {
      return {
        ok: true,
        current,
        other,
        mutated: inboxDuplicateDecisionDoesNotMutate().mutated,
        noExternalSideEffect: true,
      }
    }

    const nextCurrent = withMetadata(
      current,
      {
        related: currentRecord.related,
        dismissed: upsertLink(currentRecord.dismissed, {
          itemId: other.id,
          fieldIds: command.fieldIds,
          at,
        }),
        events: appendHistory(currentRecord.events, {
          id: `duplicate_dismissed:${other.id}:${at}`,
          kind: 'duplicate_dismissed',
          otherItemId: other.id,
          fieldIds: command.fieldIds,
          at,
        }),
      },
      at,
    )

    return {
      ok: true,
      current: nextCurrent,
      other,
      mutated: inboxDuplicateDecisionDoesNotMutate().mutated,
      noExternalSideEffect: true,
    }
  }

  if (command.type === 'relate') {
    if (currentRecord.related.some((link) => link.itemId === other.id)) {
      return {
        ok: true,
        current,
        other,
        mutated: inboxDuplicateDecisionDoesNotMutate().mutated,
        noExternalSideEffect: true,
      }
    }

    const link: InboxDuplicateLink = {
      itemId: other.id,
      fieldIds: command.fieldIds,
      at,
    }
    const reverseLink: InboxDuplicateLink = {
      itemId: current.id,
      fieldIds: command.fieldIds,
      at,
    }

    const nextCurrent = withMetadata(
      current,
      {
        related: upsertLink(currentRecord.related, link),
        dismissed: removeLink(currentRecord.dismissed, other.id),
        events: appendHistory(currentRecord.events, {
          id: `related_marked:${other.id}:${at}`,
          kind: 'related_marked',
          otherItemId: other.id,
          fieldIds: command.fieldIds,
          at,
        }),
      },
      at,
    )
    const nextOther = withMetadata(
      other,
      {
        related: upsertLink(otherRecord.related, reverseLink),
        dismissed: removeLink(otherRecord.dismissed, current.id),
        events: appendHistory(otherRecord.events, {
          id: `related_marked:${current.id}:${at}`,
          kind: 'related_marked',
          otherItemId: current.id,
          fieldIds: command.fieldIds,
          at,
        }),
      },
      at,
    )

    return {
      ok: true,
      current: nextCurrent,
      other: nextOther,
      mutated: inboxDuplicateDecisionDoesNotMutate().mutated,
      noExternalSideEffect: true,
    }
  }

  if (!currentRecord.related.some((link) => link.itemId === other.id)) {
    return {
      ok: true,
      current,
      other,
      mutated: inboxDuplicateDecisionDoesNotMutate().mutated,
      noExternalSideEffect: true,
    }
  }

  const nextCurrent = withMetadata(
    current,
    {
      related: removeLink(currentRecord.related, other.id),
      dismissed: currentRecord.dismissed,
      events: appendHistory(currentRecord.events, {
        id: `related_removed:${other.id}:${at}`,
        kind: 'related_removed',
        otherItemId: other.id,
        fieldIds: currentRecord.related.find((link) => link.itemId === other.id)?.fieldIds ?? [],
        at,
      }),
    },
    at,
  )
  const nextOther = withMetadata(
    other,
    {
      related: removeLink(otherRecord.related, current.id),
      dismissed: otherRecord.dismissed,
      events: appendHistory(otherRecord.events, {
        id: `related_removed:${current.id}:${at}`,
        kind: 'related_removed',
        otherItemId: current.id,
        fieldIds: otherRecord.related.find((link) => link.itemId === current.id)?.fieldIds ?? [],
        at,
      }),
    },
    at,
  )

  return {
    ok: true,
    current: nextCurrent,
    other: nextOther,
    mutated: inboxDuplicateDecisionDoesNotMutate().mutated,
    noExternalSideEffect: true,
  }
}

export function applyInboxDuplicateDecisionToItems(
  items: readonly InboxItem[],
  itemId: string,
  command: InboxDuplicateDecisionCommand,
): { ok: true; items: InboxItem[] } | { ok: false; error: string } {
  const current = items.find((item) => item.id === itemId)
  const other = items.find((item) => item.id === command.otherItemId)
  if (!current || !other) {
    return { ok: false, error: 'Die Vergleichsanfrage wurde nicht gefunden.' }
  }

  const applied = applyInboxDuplicateDecision(current, other, command)
  if (!applied.ok) {
    return applied
  }

  return {
    ok: true,
    items: items.map((item) => {
      if (item.id === applied.current.id) {
        return applied.current
      }
      if (item.id === applied.other.id) {
        return applied.other
      }
      return item
    }),
  }
}

type DuplicateHrefOptions = {
  phase?: KfzWorkQueueFilter | null
  queue?: InboxWorkQueueFilter | null
  source?: InboxSourceFilter | null
  q?: string | null
  basePath?: string | null
}

function receivedAtOf(item: Pick<InboxItem, 'received_at' | 'created_at'>): string {
  return item.received_at?.trim() || item.created_at
}

function presentCandidateSummary(item: InboxItem): string {
  const review = presentKfzWebsiteInboxItem(item)
  if (review?.listSummary) {
    return review.listSummary
  }
  const source = readInboxSourceContent(item.content)
  if (source.trim()) {
    return truncateInboxContentPreview(source)
  }
  return getInboxListTitle(item)
}

function presentCandidate(
  current: InboxItem,
  other: InboxItem,
  matches: InboxDuplicateMatch[],
  options?: DuplicateHrefOptions & {
    linkedTaskId?: string | null
  },
): InboxDuplicateCandidate {
  const receivedAt = receivedAtOf(other)
  const chip = presentInboxStatusChip(other, options?.linkedTaskId ?? null)

  return {
    itemId: other.id,
    headline: getInboxListTitle(other),
    sourceLabel: getInboxItemSourceLabel(other),
    receivedAt,
    receivedAtLabel: formatInboxListDate(receivedAt),
    receivedAtLongLabel: formatInboxDateTime(receivedAt),
    statusLabel: chip?.label ?? (other.processed_at ? 'Erledigt' : 'Neu eingegangen'),
    summary: presentCandidateSummary(other),
    matches,
    matchFieldIds: matches.map((match) => match.fieldId),
    href: buildInboxHref({
      itemId: other.id,
      phase: options?.phase ?? 'all',
      queue: options?.queue ?? 'all',
      source: options?.source ?? 'all',
      q: options?.q,
      basePath: options?.basePath,
    }),
    returnHref: buildInboxHref({
      itemId: current.id,
      phase: options?.phase ?? 'all',
      queue: options?.queue ?? 'all',
      source: options?.source ?? 'all',
      q: options?.q,
      basePath: options?.basePath,
    }),
  }
}

export function presentInboxDuplicateReview(
  item: InboxItem,
  allItems: readonly InboxItem[],
  options?: DuplicateHrefOptions & {
    taskRelationsByItemId?: Record<string, string>
    now?: Date
    allowLocalFixtureFacts?: boolean
  },
): InboxDuplicateReview {
  const currentTokens = collectInboxExactIdentityTokens(item)
  const record = readInboxDuplicateReviewRecord(item.inbound_metadata)
  const dismissedIds = new Set(record.dismissed.map((link) => link.itemId))
  const relatedById = new Map(record.related.map((link) => [link.itemId, link]))
  const pending: InboxDuplicateCandidate[] = []
  const related: InboxDuplicateRelatedItem[] = []

  for (const other of allItems) {
    if (other.id === item.id) {
      continue
    }

    const matches = matchInboxExactIdentityTokens(currentTokens, collectInboxExactIdentityTokens(other))
    const relatedLink = relatedById.get(other.id)
    if (matches.length === 0 && !relatedLink) {
      continue
    }

    const candidate = presentCandidate(item, other, matches, {
      ...options,
      linkedTaskId: options?.taskRelationsByItemId?.[other.id] ?? null,
    })

    if (relatedLink) {
      related.push({
        ...candidate,
        matches: matches.length > 0 ? matches : candidate.matches,
        relatedAt: relatedLink.at,
        relatedAtLabel: relatedLink.at ? formatInboxDateTime(relatedLink.at) : null,
      })
      continue
    }

    if (dismissedIds.has(other.id) || matches.length === 0) {
      continue
    }

    pending.push(candidate)
  }

  pending.sort((left, right) => {
    if (left.matches.length !== right.matches.length) {
      return right.matches.length - left.matches.length
    }
    if (left.receivedAt !== right.receivedAt) {
      return left.receivedAt.localeCompare(right.receivedAt)
    }
    return left.itemId.localeCompare(right.itemId)
  })
  related.sort((left, right) => left.receivedAt.localeCompare(right.receivedAt))

  return {
    itemId: item.id,
    pending,
    related,
    hasPending: pending.length > 0,
    hasRelated: related.length > 0,
    visible: pending.length > 0 || related.length > 0,
    noAutomaticDecision: true,
    noExternalSideEffect: true,
  }
}

export function parseInboxDuplicateFieldIds(value: string | null | undefined): InboxDuplicateFieldId[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is InboxDuplicateFieldId => isDuplicateFieldId(entry))
}
