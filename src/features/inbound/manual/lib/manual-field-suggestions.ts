/**
 * Deterministic field suggestions from pasted text.
 * Reuses existing local heuristics. Never matches customers. Not an AI decision.
 */

import { extractOriginFromForwardedBody } from '@/features/email/lib/email-origin-heuristics'
import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import type { InboundSender } from '@/features/inbound/types/inbound-item'
import { MANUAL_FIELD_SUGGESTION_LABEL } from '@/features/inbound/manual/lib/manual-capture-copy'
import { sanitizeManualCaptureTitle } from '@/features/inbound/manual/lib/sanitize-manual-text'

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const INTERNATIONAL_PHONE_PATTERN = /\+\d[\d\s()./-]{6,}\d/

export type ManualFieldSuggestion = {
  field: 'title' | 'origin.displayName' | 'origin.address' | 'origin.addressKind'
  value: string
  label: typeof MANUAL_FIELD_SUGGESTION_LABEL
}

export type ManualCaptureFieldSuggestions = {
  title: string | null
  origin: InboundSender | null
  items: ManualFieldSuggestion[]
}

function pushSuggestion(
  items: ManualFieldSuggestion[],
  field: ManualFieldSuggestion['field'],
  value: string | null | undefined,
) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return
  }

  items.push({
    field,
    value: trimmed,
    label: MANUAL_FIELD_SUGGESTION_LABEL,
  })
}

function extractPhoneCandidate(sourceText: string): string | null {
  const international = sourceText.match(INTERNATIONAL_PHONE_PATTERN)
  if (international?.[0]) {
    return normalizeInternationalPhone(international[0])
  }

  return null
}

/**
 * Best-effort structured fields from source text.
 * Empty when the text has no recognizable title/contact tokens.
 */
export function suggestManualCaptureFields(
  sourceText: string,
  rawText = sourceText,
): ManualCaptureFieldSuggestions {
  const items: ManualFieldSuggestion[] = []
  const title = sanitizeManualCaptureTitle(sourceText)
  pushSuggestion(items, 'title', title)

  const forwarded =
    extractOriginFromForwardedBody(rawText) ?? extractOriginFromForwardedBody(sourceText)
  if (forwarded?.address && EMAIL_PATTERN.test(forwarded.address)) {
    const origin: InboundSender = {
      displayName: forwarded.displayName ?? null,
      address: forwarded.address,
      addressKind: 'email',
    }
    pushSuggestion(items, 'origin.displayName', origin.displayName)
    pushSuggestion(items, 'origin.address', origin.address)
    pushSuggestion(items, 'origin.addressKind', origin.addressKind)
    return { title, origin, items }
  }

  const emailMatch = sourceText.match(EMAIL_PATTERN)
  if (emailMatch?.[0]) {
    const origin: InboundSender = {
      displayName: null,
      address: emailMatch[0].trim().toLowerCase(),
      addressKind: 'email',
    }
    pushSuggestion(items, 'origin.address', origin.address)
    pushSuggestion(items, 'origin.addressKind', origin.addressKind)
    return { title, origin, items }
  }

  const phone = extractPhoneCandidate(sourceText)
  if (phone) {
    const origin: InboundSender = {
      displayName: null,
      address: phone,
      addressKind: 'phone',
    }
    pushSuggestion(items, 'origin.address', origin.address)
    pushSuggestion(items, 'origin.addressKind', origin.addressKind)
    return { title, origin, items }
  }

  return { title, origin: null, items }
}
