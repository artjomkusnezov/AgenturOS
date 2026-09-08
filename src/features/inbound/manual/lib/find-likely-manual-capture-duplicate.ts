/**
 * Deterministic local duplicate hint for manual capture.
 * Compares draft facts already on screen with existing inbox items.
 * Never merges, blocks, or changes status.
 */

import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import { getInboxListTitle } from '@/features/inbox/lib/format-inbox-content'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { sanitizeManualCaptureText, sanitizeManualCaptureTitle } from '@/features/inbound/manual/lib/sanitize-manual-text'

export const MANUAL_CAPTURE_RECENT_TITLE_WINDOW_MS = 48 * 60 * 60 * 1000

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

export type ManualCaptureDuplicateReason = 'source_text' | 'contact' | 'recent_title'

export type ManualCaptureDuplicateCandidate = Pick<
  InboxItem,
  'id' | 'title' | 'content' | 'origin' | 'sender' | 'received_at' | 'created_at'
>

export type ManualCaptureDuplicateMatch = {
  itemId: string
  title: string
  receivedAt: string
  reason: ManualCaptureDuplicateReason
}

export type FindLikelyManualCaptureDuplicateInput = {
  sourceText: string
  title?: string | null
  originAddress?: string | null
  originAddressKind?: string | null
  existingItems: readonly ManualCaptureDuplicateCandidate[]
  now?: string | number | Date
}

const REASON_RANK: Record<ManualCaptureDuplicateReason, number> = {
  source_text: 0,
  contact: 1,
  recent_title: 2,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toTimestamp(value: string | number | Date | null | undefined): number | null {
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const ms = Date.parse(value)
    return Number.isFinite(ms) ? ms : null
  }

  return null
}

function normalizeTitle(value: string | null | undefined): string | null {
  const sanitized = sanitizeManualCaptureTitle(value ?? '')
  if (!sanitized) {
    return null
  }

  const normalized = sanitized.replace(/\s+/g, ' ').trim().toLowerCase()
  return normalized.length >= 3 ? normalized : null
}

function normalizeEmail(value: string): string | null {
  const match = value.trim().toLowerCase().match(EMAIL_PATTERN)
  return match?.[0] ?? null
}

function normalizeContactToken(address: string, addressKind?: string | null): string | null {
  const trimmed = address.trim()
  if (!trimmed) {
    return null
  }

  if (addressKind === 'email' || trimmed.includes('@')) {
    const email = normalizeEmail(trimmed)
    return email ? `email:${email}` : null
  }

  const phone = normalizeInternationalPhone(trimmed)
  return phone ? `phone:${phone}` : null
}

function readAddressFields(value: unknown): Array<{ address: string; addressKind: string | null }> {
  if (!isRecord(value)) {
    return []
  }

  const address = typeof value.address === 'string' ? value.address : ''
  if (!address.trim()) {
    return []
  }

  const addressKind =
    value.addressKind === 'email' || value.addressKind === 'phone' || value.addressKind === 'other'
      ? value.addressKind
      : null

  return [{ address, addressKind }]
}

function collectItemContacts(item: ManualCaptureDuplicateCandidate): Set<string> {
  const tokens = new Set<string>()

  for (const field of [...readAddressFields(item.origin), ...readAddressFields(item.sender)]) {
    const token = normalizeContactToken(field.address, field.addressKind)
    if (token) {
      tokens.add(token)
    }
  }

  return tokens
}

function collectDraftContacts(originAddress: string | null | undefined, originAddressKind: string | null | undefined): Set<string> {
  const tokens = new Set<string>()
  const token = normalizeContactToken(originAddress ?? '', originAddressKind)
  if (token) {
    tokens.add(token)
  }
  return tokens
}

function sharesContact(draft: Set<string>, item: Set<string>): boolean {
  for (const token of draft) {
    if (item.has(token)) {
      return true
    }
  }
  return false
}

function itemReceivedAt(item: ManualCaptureDuplicateCandidate): string {
  return item.received_at || item.created_at
}

function isRecentTitle(item: ManualCaptureDuplicateCandidate, nowMs: number): boolean {
  const receivedMs = toTimestamp(itemReceivedAt(item))
  if (receivedMs === null) {
    return false
  }

  const age = nowMs - receivedMs
  return age >= 0 && age <= MANUAL_CAPTURE_RECENT_TITLE_WINDOW_MS
}

function betterMatch(
  current: ManualCaptureDuplicateMatch | null,
  next: ManualCaptureDuplicateMatch,
): ManualCaptureDuplicateMatch {
  if (!current) {
    return next
  }

  const rankDelta = REASON_RANK[next.reason] - REASON_RANK[current.reason]
  if (rankDelta < 0) {
    return next
  }

  if (rankDelta > 0) {
    return current
  }

  const currentTs = toTimestamp(current.receivedAt) ?? 0
  const nextTs = toTimestamp(next.receivedAt) ?? 0
  return nextTs >= currentTs ? next : current
}

/**
 * Returns the strongest likely duplicate, or null.
 * Matching is local and deterministic. Callers must not auto-block.
 */
export function findLikelyManualCaptureDuplicate(
  input: FindLikelyManualCaptureDuplicateInput,
): ManualCaptureDuplicateMatch | null {
  const sourceText = sanitizeManualCaptureText(input.sourceText)
  const title = normalizeTitle(input.title)
  const draftContacts = collectDraftContacts(input.originAddress, input.originAddressKind)
  const nowMs = toTimestamp(input.now) ?? Date.now()

  let best: ManualCaptureDuplicateMatch | null = null

  for (const item of input.existingItems) {
    const itemSource = sanitizeManualCaptureText(item.content ?? '')
    const itemTitle = normalizeTitle(item.title)
    const receivedAt = itemReceivedAt(item)

    let reason: ManualCaptureDuplicateReason | null = null

    if (sourceText && itemSource && sourceText === itemSource) {
      reason = 'source_text'
    } else if (draftContacts.size > 0 && sharesContact(draftContacts, collectItemContacts(item))) {
      reason = 'contact'
    } else if (title && itemTitle && title === itemTitle && isRecentTitle(item, nowMs)) {
      reason = 'recent_title'
    }

    if (!reason) {
      continue
    }

    best = betterMatch(best, {
      itemId: item.id,
      title: getInboxListTitle(item),
      receivedAt,
      reason,
    })
  }

  return best
}
