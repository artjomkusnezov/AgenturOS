/**
 * Deterministic factual search over already-visible inbox working-copy fields.
 * No enrichment, guessed identity joining, AI decision or mutation.
 */

import { formatInboundSenderLabel } from '@/features/inbound/lib/inbound-item-utils'
import type { InboundSenderRecord } from '@/features/inbound/types/inbound-item'
import { readInboxSourceContent } from '@/features/inbox/lib/kfz-response-draft'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import { presentUnifiedInboxCard } from '@/features/inbox/lib/present-unified-inbox-card'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const INBOX_SEARCH_PARAM = 'q' as const

export const INBOX_SEARCH_QUERY_MAX_LENGTH = 200

export const INBOX_SEARCH_NAV_LABEL = 'Eingang durchsuchen' as const

export const INBOX_SEARCH_PLACEHOLDER =
  'Name, Telefon, E-Mail, Ort, Kennzeichen, Text…' as const

export const INBOX_SEARCH_CLEAR_LABEL = 'Suche leeren' as const

export const INBOX_SEARCH_NO_RESULTS_TITLE = 'Kein Treffer' as const

export const INBOX_SEARCH_NO_RESULTS_HINT =
  'Nichts passt zu dieser Suche. Status bleiben unverändert — nichts wird automatisch angelegt.' as const

export const INBOX_SEARCH_NO_MUTATION_NOTE =
  'Suche ändert keinen Status, markiert keinen Kontakt und legt keine Aufgabe an.' as const

export const INBOX_SEARCH_KEYBOARD_HINT = 'Taste / fokussiert die Suche' as const

export const INBOX_SEARCH_FIELD_IDS = [
  'customerName',
  'phone',
  'email',
  'location',
  'request',
  'vehicle',
  'source',
  'summary',
  'originalText',
] as const

export type InboxSearchFieldId = (typeof INBOX_SEARCH_FIELD_IDS)[number]

export const INBOX_SEARCH_FIELD_LABELS: Record<InboxSearchFieldId, string> = {
  customerName: 'Name',
  phone: 'Telefon',
  email: 'E-Mail',
  location: 'Ort',
  request: 'Anliegen',
  vehicle: 'Fahrzeug',
  source: 'Quelle',
  summary: 'Kurzfassung',
  originalText: 'Originaltext',
}

export type InboxSearchableField = {
  id: InboxSearchFieldId
  label: string
  value: string
}

export type InboxSearchMatch = {
  fieldId: InboxSearchFieldId
  fieldLabel: string
  excerpt: string
  matchedValue: string
}

export type InboxSearchHit = {
  itemId: string
  matches: InboxSearchMatch[]
  primaryMatch: InboxSearchMatch
}

const PHONE_DIGIT_MIN = 6
const EXCERPT_RADIUS = 42

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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

function pushField(
  fields: InboxSearchableField[],
  id: InboxSearchFieldId,
  value: string | null | undefined,
) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) {
    return
  }
  if (fields.some((field) => field.id === id && field.value === trimmed)) {
    return
  }
  fields.push({
    id,
    label: INBOX_SEARCH_FIELD_LABELS[id],
    value: trimmed,
  })
}

export function parseInboxSearchQuery(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  const collapsed = value.trim().replace(/\s+/g, ' ')
  if (!collapsed) {
    return ''
  }

  return collapsed.length > INBOX_SEARCH_QUERY_MAX_LENGTH
    ? collapsed.slice(0, INBOX_SEARCH_QUERY_MAX_LENGTH)
    : collapsed
}

export function normalizeInboxSearchText(value: string): string {
  return value.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function normalizeInboxSearchPhone(value: string): string {
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

export function inboxSearchQueryLooksLikePhone(query: string): boolean {
  return normalizeInboxSearchPhone(query).length >= PHONE_DIGIT_MIN
}

function textContainsQuery(value: string, query: string): boolean {
  const haystack = normalizeInboxSearchText(value)
  const needle = normalizeInboxSearchText(query)
  return Boolean(needle) && haystack.includes(needle)
}

function phoneContainsQuery(value: string, query: string): boolean {
  const fieldDigits = normalizeInboxSearchPhone(value)
  const queryDigits = normalizeInboxSearchPhone(query)
  if (queryDigits.length < PHONE_DIGIT_MIN || fieldDigits.length < PHONE_DIGIT_MIN) {
    return false
  }

  return fieldDigits.includes(queryDigits) || queryDigits.includes(fieldDigits)
}

function fieldMatchesQuery(field: InboxSearchableField, query: string): boolean {
  if (textContainsQuery(field.value, query)) {
    return true
  }

  return (
    (field.id === 'phone' || field.id === 'originalText' || field.id === 'summary') &&
    phoneContainsQuery(field.value, query)
  )
}

function findMatchIndex(value: string, query: string): number {
  const lowerValue = normalizeInboxSearchText(value)
  const lowerQuery = normalizeInboxSearchText(query)
  if (lowerQuery && lowerValue.includes(lowerQuery)) {
    return lowerValue.indexOf(lowerQuery)
  }

  if (phoneContainsQuery(value, query)) {
    const queryDigits = normalizeInboxSearchPhone(query)
    const compact = value.toLowerCase()
    const digitOnly = compact.replace(/\D/g, '')
    const at = digitOnly.indexOf(queryDigits)
    if (at >= 0) {
      let seen = 0
      for (let index = 0; index < value.length; index += 1) {
        if (/\d/.test(value[index] ?? '')) {
          if (seen === at) {
            return index
          }
          seen += 1
        }
      }
    }
  }

  return 0
}

export function buildInboxSearchExcerpt(
  value: string,
  query: string,
  radius = EXCERPT_RADIUS,
): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (!compact) {
    return ''
  }

  const start = Math.max(0, findMatchIndex(compact, query) - radius)
  const end = Math.min(compact.length, start + radius * 2 + query.trim().length)
  const slice = compact.slice(start, end).trim()
  const prefix = start > 0 ? '…' : ''
  const suffix = end < compact.length ? '…' : ''
  return `${prefix}${slice}${suffix}`
}

function toMatch(field: InboxSearchableField, query: string): InboxSearchMatch {
  return {
    fieldId: field.id,
    fieldLabel: field.label,
    excerpt: buildInboxSearchExcerpt(field.value, query),
    matchedValue: field.value,
  }
}

export function collectInboxSearchFields(item: InboxItem): InboxSearchableField[] {
  const fields: InboxSearchableField[] = []
  const card = presentUnifiedInboxCard(item)
  const review = presentKfzWebsiteInboxItem(item)
  const originalText = review?.sourceContent ?? readInboxSourceContent(item.content)

  if (review) {
    pushField(fields, 'customerName', review.customerName)
    pushField(fields, 'phone', review.phone)
    pushField(fields, 'email', review.email)
    pushField(fields, 'location', review.location)
    pushField(fields, 'request', review.request !== 'Nicht angegeben' ? review.request : null)
    pushField(fields, 'vehicle', review.vehicle)
    pushField(fields, 'source', review.sourceLabel)
    pushField(
      fields,
      'summary',
      [review.factualSummary || card.requestSummary, review.contextNotes]
        .filter(Boolean)
        .join(' · '),
    )
    pushField(fields, 'originalText', originalText)
    return fields
  }

  const origin = readParty(item.origin)
  const sender = readParty(item.sender)
  const isManual = item.channel === 'manual'
  const name = origin.name || (isManual ? null : sender.name)
  const address = origin.address || (isManual ? null : sender.address)
  const addressKind = origin.addressKind || (isManual ? null : sender.addressKind)

  pushField(fields, 'customerName', name)
  if (address) {
    if (addressKind === 'phone' || (!address.includes('@') && /\d{6,}/.test(address))) {
      pushField(fields, 'phone', address)
    } else {
      pushField(fields, 'email', address)
    }
  }
  pushField(fields, 'request', item.title)
  pushField(fields, 'source', card.sourceLabel)
  pushField(fields, 'summary', card.requestSummary)
  pushField(fields, 'originalText', originalText)
  return fields
}

export function matchInboxItemSearch(
  item: InboxItem,
  rawQuery: string,
): InboxSearchHit | null {
  const query = parseInboxSearchQuery(rawQuery)
  if (!query) {
    return null
  }

  const fields = collectInboxSearchFields(item)
  const phraseMatches = fields.filter((field) => fieldMatchesQuery(field, query))
  const matchedFields =
    phraseMatches.length > 0
      ? phraseMatches
      : matchAllTokens(fields, query)

  if (matchedFields.length === 0) {
    return null
  }

  const matches = matchedFields.map((field) => toMatch(field, query))
  return {
    itemId: item.id,
    matches,
    primaryMatch: matches[0]!,
  }
}

function matchAllTokens(
  fields: InboxSearchableField[],
  query: string,
): InboxSearchableField[] {
  const tokens = parseInboxSearchQuery(query).split(' ').filter(Boolean)
  if (tokens.length < 2) {
    return []
  }

  const collected: InboxSearchableField[] = []
  for (const token of tokens) {
    const tokenFields = fields.filter((field) => fieldMatchesQuery(field, token))
    if (tokenFields.length === 0) {
      return []
    }
    for (const field of tokenFields) {
      if (!collected.some((entry) => entry.id === field.id && entry.value === field.value)) {
        collected.push(field)
      }
    }
  }

  return collected
}

export function matchesInboxSearchQuery(item: InboxItem, rawQuery: string): boolean {
  const query = parseInboxSearchQuery(rawQuery)
  if (!query) {
    return true
  }

  return matchInboxItemSearch(item, query) !== null
}

export function filterInboxItemsBySearch<T extends InboxItem>(
  items: T[],
  rawQuery: string,
): T[] {
  const query = parseInboxSearchQuery(rawQuery)
  if (!query) {
    return items
  }

  return items.filter((item) => matchesInboxSearchQuery(item, query))
}

export function inboxSearchDoesNotMutate(): {
  mutated: {
    content: false
    processed: false
    task: false
    contacted: false
    status: false
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
    },
    noExternalSideEffect: true,
  }
}
