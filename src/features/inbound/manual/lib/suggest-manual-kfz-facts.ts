/**
 * Deterministic Kfz fact suggestions from an employee-chosen Kfz working copy.
 * Never classifies the product. Empty when the text has no recognizable tokens.
 */

import { extractOriginFromForwardedBody } from '@/features/email/lib/email-origin-heuristics'
import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import { MANUAL_FIELD_SUGGESTION_LABEL } from '@/features/inbound/manual/lib/manual-capture-copy'
import type { ManualCaptureOriginKind } from '@/features/inbound/manual/lib/manual-capture-origin'
import { KFZ_PREFERRED_CHANNELS, type KfzPreferredChannel } from '@/features/inbound/kfz/types/public-kfz-inquiry'

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const INTERNATIONAL_PHONE_PATTERN = /\+\d[\d\s()./-]{6,}\d/
const POSTAL_CITY_PATTERN =
  /\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß.'\-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.'\-]+){0,3})\b/
const CUSTOMER_NAME_PATTERN =
  /(?:kunde|kundin)[ \t]+([A-ZÄÖÜ][\p{L}'-]+(?:[ \t]+[A-ZÄÖÜ][\p{L}'-]+)?)/iu
const REASON_HINT_PATTERN = /versicherung|schaden|unfall|preischeck|deckung|kasko|haftpflicht/i

export type ManualKfzFactField =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'postalCode'
  | 'city'
  | 'preferredChannel'
  | 'inquiryReason'
  | 'vehicleMake'
  | 'vehicleModel'
  | 'vehicleYear'

export type ManualKfzFactSuggestion = {
  field: ManualKfzFactField
  value: string
  label: typeof MANUAL_FIELD_SUGGESTION_LABEL
}

export type ManualKfzSuggestedFacts = {
  fullName: string | null
  phone: string | null
  email: string | null
  postalCode: string | null
  city: string | null
  preferredChannel: KfzPreferredChannel | null
  inquiryReason: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  contextNotes: string | null
  items: ManualKfzFactSuggestion[]
}

function pushSuggestion(
  items: ManualKfzFactSuggestion[],
  field: ManualKfzFactField,
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

function readLabeledValue(sourceText: string, labels: string[]): string | null {
  const prefix = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const pattern = new RegExp(`^(?:${prefix})\\s*[:\\-]\\s*(.+)$`, 'i')

  for (const rawLine of sourceText.split(/\r\n|\n|\r/)) {
    const line = rawLine.trim()
    const match = line.match(pattern)
    const value = match?.[1]?.trim()
    if (value) {
      return value
    }
  }

  return null
}

function extractPhone(sourceText: string): string | null {
  const labeled = readLabeledValue(sourceText, ['Telefon', 'Tel', 'Handy', 'Mobil'])
  if (labeled) {
    const normalized = normalizeInternationalPhone(labeled)
    if (normalized) {
      return normalized
    }

    const digits = labeled.replace(/[^\d+]/g, '')
    return digits.length > 0 ? digits : null
  }

  const international = sourceText.match(INTERNATIONAL_PHONE_PATTERN)
  if (international?.[0]) {
    return normalizeInternationalPhone(international[0])
  }

  return null
}

function extractEmail(sourceText: string, rawText = sourceText): string | null {
  const labeled = readLabeledValue(sourceText, ['E-Mail', 'Email', 'Mail'])
  if (labeled && EMAIL_PATTERN.test(labeled)) {
    return labeled.match(EMAIL_PATTERN)?.[0].toLowerCase() ?? null
  }

  const forwarded = extractOriginFromForwardedBody(rawText) ?? extractOriginFromForwardedBody(sourceText)
  if (forwarded?.address && EMAIL_PATTERN.test(forwarded.address)) {
    return forwarded.address.toLowerCase()
  }

  const emailMatch = sourceText.match(EMAIL_PATTERN)
  return emailMatch?.[0] ? emailMatch[0].toLowerCase() : null
}

function extractFullName(sourceText: string, rawText = sourceText): string | null {
  const labeled = readLabeledValue(sourceText, ['Name', 'Kunde', 'Kundin'])
  if (labeled && !EMAIL_PATTERN.test(labeled)) {
    return labeled.replace(/^(?:kunde|kundin)\s+/i, '').trim() || null
  }

  const forwarded = extractOriginFromForwardedBody(rawText) ?? extractOriginFromForwardedBody(sourceText)
  if (forwarded?.displayName?.trim()) {
    return forwarded.displayName.trim()
  }

  const customer = sourceText.match(CUSTOMER_NAME_PATTERN)
  if (customer?.[1]) {
    return customer[1].trim()
  }

  return null
}

function extractLocation(sourceText: string): { postalCode: string | null; city: string | null } {
  const labeled = readLabeledValue(sourceText, ['Ort', 'PLZ', 'Stadt'])
  const haystack = labeled ?? sourceText
  const match = haystack.match(POSTAL_CITY_PATTERN)
  if (!match) {
    return { postalCode: null, city: null }
  }

  return {
    postalCode: match[1] ?? null,
    city: match[2]?.trim() ?? null,
  }
}

function extractVehicle(sourceText: string): {
  make: string | null
  model: string | null
  year: string | null
} {
  const labeled = readLabeledValue(sourceText, ['Fahrzeug', 'Auto', 'Wagen'])
  if (!labeled) {
    return { make: null, model: null, year: null }
  }

  const yearMatch = labeled.match(/\b((?:19|20)\d{2})\b/)
  const year = yearMatch?.[1] ?? null
  const withoutYear = year ? labeled.replace(year, ' ').replace(/\s+/g, ' ').trim() : labeled
  const parts = withoutYear.split(/\s+/).filter(Boolean)

  return {
    make: parts[0] ?? null,
    model: parts.slice(1).join(' ') || null,
    year,
  }
}

function extractInquiryReason(sourceText: string): string | null {
  const labeled = readLabeledValue(sourceText, ['Anliegen', 'Grund', 'Betreff'])
  if (labeled) {
    return labeled
  }

  for (const rawLine of sourceText.split(/\r\n|\n|\r/)) {
    const line = rawLine.trim()
    if (!line || /^(von|telefon|e-mail|email|ort|fahrzeug|name|kunde)\b/i.test(line)) {
      continue
    }
    if (REASON_HINT_PATTERN.test(line)) {
      return line
    }
  }

  return null
}

function preferredChannelFromOriginKind(
  originKind: ManualCaptureOriginKind,
): KfzPreferredChannel | null {
  if (originKind === 'phone_call') {
    return 'phone'
  }
  if (originKind === 'pasted_email') {
    return 'email'
  }
  return null
}

export function isKfzPreferredChannel(value: unknown): value is KfzPreferredChannel {
  return (
    typeof value === 'string' &&
    (KFZ_PREFERRED_CHANNELS as readonly string[]).includes(value)
  )
}

/**
 * Best-effort Kfz facts from source text after the employee chose Kfz.
 * Does not decide that the text is a Kfz case.
 */
export function suggestManualKfzFacts(
  sourceText: string,
  originKind: ManualCaptureOriginKind,
  rawText = sourceText,
): ManualKfzSuggestedFacts {
  const items: ManualKfzFactSuggestion[] = []
  const fullName = extractFullName(sourceText, rawText)
  const phone = extractPhone(sourceText)
  const email = extractEmail(sourceText, rawText)
  const location = extractLocation(sourceText)
  const vehicle = extractVehicle(sourceText)
  const inquiryReason = extractInquiryReason(sourceText)
  const preferredChannel = preferredChannelFromOriginKind(originKind)

  pushSuggestion(items, 'fullName', fullName)
  pushSuggestion(items, 'phone', phone)
  pushSuggestion(items, 'email', email)
  pushSuggestion(items, 'postalCode', location.postalCode)
  pushSuggestion(items, 'city', location.city)
  pushSuggestion(items, 'preferredChannel', preferredChannel)
  pushSuggestion(items, 'inquiryReason', inquiryReason)
  pushSuggestion(items, 'vehicleMake', vehicle.make)
  pushSuggestion(items, 'vehicleModel', vehicle.model)
  pushSuggestion(items, 'vehicleYear', vehicle.year)

  return {
    fullName,
    phone,
    email,
    postalCode: location.postalCode,
    city: location.city,
    preferredChannel,
    inquiryReason,
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    vehicleYear: vehicle.year,
    contextNotes: null,
    items,
  }
}
