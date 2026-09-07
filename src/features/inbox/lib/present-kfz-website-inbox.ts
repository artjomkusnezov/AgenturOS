/**
 * Operator-facing facts for a Kfz website inbox working copy.
 * Reads the existing normalized inbound item — no CRM, no AI, no side effects.
 */

import { isKfzWebsiteInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { getInboxListTitle } from '@/features/inbox/lib/format-inbox-content'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const KFZ_WEBSITE_SOURCE_LABEL = 'Website · Kfz' as const

export const KFZ_REVIEW_NO_AUTO_ACTION =
  'Nichts wird automatisch gesendet oder angelegt.'

export type KfzWebsiteInboxReview = {
  headline: string
  sourceLabel: typeof KFZ_WEBSITE_SOURCE_LABEL
  acquisitionSource: string | null
  customerName: string
  location: string | null
  phone: string | null
  email: string | null
  preferredChannelLabel: string
  preferredChannel: string | null
  request: string
  vehicle: string | null
  missingInformation: string[]
  urgencyNote: string
  nextManualAction: string
}

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

function readSenderName(sender: InboxItem['sender']): string | null {
  if (!isRecord(sender)) {
    return null
  }
  return asNullableString(sender.displayName)
}

function labelPreferredChannel(channel: string | null): string {
  if (channel === 'phone') {
    return 'Telefon'
  }
  if (channel === 'email') {
    return 'E-Mail'
  }
  if (channel === 'whatsapp') {
    return 'WhatsApp'
  }
  return 'Nicht angegeben'
}

function detectUrgencyNote(reason: string | null, notes: string | null): string {
  const text = `${reason ?? ''} ${notes ?? ''}`.toLowerCase()
  if (/unfall|schaden|abschlepp|airbag|notfall|sofort|dringend/.test(text)) {
    return 'Anliegen nennt Unfall, Schaden oder Eilhinweis — bitte vorrangig manuell prüfen.'
  }
  return 'Kein Unfall- oder Schadenhinweis in den Angaben.'
}

function collectMissing(input: {
  phone: string | null
  email: string | null
  preferredChannel: string | null
  reason: string | null
  vehicle: string | null
  location: string | null
}): string[] {
  const missing: string[] = []

  if (!input.phone && !input.email) {
    missing.push('Erreichbarkeit (Telefon oder E-Mail)')
  } else if (
    (input.preferredChannel === 'phone' || input.preferredChannel === 'whatsapp') &&
    !input.phone
  ) {
    missing.push('Telefonnummer für den bevorzugten Kanal')
  } else if (input.preferredChannel === 'email' && !input.email) {
    missing.push('E-Mail-Adresse für den bevorzugten Kanal')
  }

  if (!input.reason) {
    missing.push('Konkretes Anliegen')
  }

  if (!input.vehicle) {
    missing.push('Fahrzeugdaten (Marke/Modell/Jahr — falls relevant)')
  }

  if (!input.location) {
    missing.push('Ort / PLZ')
  }

  return missing
}

function buildNextManualAction(input: {
  preferredChannel: string | null
  phone: string | null
  email: string | null
}): string {
  const suffix = KFZ_REVIEW_NO_AUTO_ACTION

  if (input.preferredChannel === 'email' && input.email) {
    return `Anfrage prüfen und per E-Mail kontaktieren. ${suffix}`
  }
  if (input.preferredChannel === 'whatsapp' && input.phone) {
    return `Anfrage prüfen und per WhatsApp kontaktieren. ${suffix}`
  }
  if (input.phone) {
    return `Anfrage prüfen und telefonisch kontaktieren. ${suffix}`
  }
  if (input.email) {
    return `Anfrage prüfen und per E-Mail kontaktieren. ${suffix}`
  }
  return `Anfrage prüfen und einen Kontaktweg wählen. ${suffix}`
}

/**
 * Builds a factual review model from the persisted inbox working copy.
 * Returns null when the item is not a Kfz website inquiry.
 */
export function presentKfzWebsiteInboxItem(
  item: Pick<
    InboxItem,
    'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'sender'
  >,
): KfzWebsiteInboxReview | null {
  if (!isKfzWebsiteInboxItem(item)) {
    return null
  }

  const meta = isRecord(item.inbound_metadata) ? item.inbound_metadata : null
  const acquisition = meta && isRecord(meta.acquisition) ? meta.acquisition : null
  const inquiry = meta && isRecord(meta.inquiry) ? meta.inquiry : null
  const location = inquiry && isRecord(inquiry.location) ? inquiry.location : null
  const vehicle = inquiry && isRecord(inquiry.vehicle) ? inquiry.vehicle : null

  const phone = asNullableString(inquiry?.phone)
  const email = asNullableString(inquiry?.email)
  const reason = asNullableString(inquiry?.reason)
  const preferredChannel = asNullableString(inquiry?.preferredChannel)
  const contextNotes = asNullableString(inquiry?.contextNotes)
  const postalCode = asNullableString(location?.postalCode)
  const city = asNullableString(location?.city)
  const locationLabel = [postalCode, city].filter(Boolean).join(' ') || null
  const vehicleLabel =
    [
      asNullableString(vehicle?.make),
      asNullableString(vehicle?.model),
      asNullableString(vehicle?.year),
    ]
      .filter((part): part is string => Boolean(part))
      .join(' ') || null

  const customerName =
    readSenderName(item.sender) ??
    asNullableString(item.title?.replace(/^kfz-anfrage\s*·\s*/i, '')) ??
    'Unbekannt'

  return {
    headline: getInboxListTitle(item),
    sourceLabel: KFZ_WEBSITE_SOURCE_LABEL,
    acquisitionSource: asNullableString(acquisition?.source),
    customerName,
    location: locationLabel,
    phone,
    email,
    preferredChannelLabel: labelPreferredChannel(preferredChannel),
    preferredChannel,
    request: reason ?? 'Nicht angegeben',
    vehicle: vehicleLabel,
    missingInformation: collectMissing({
      phone,
      email,
      preferredChannel,
      reason,
      vehicle: vehicleLabel,
      location: locationLabel,
    }),
    urgencyNote: detectUrgencyNote(reason, contextNotes),
    nextManualAction: buildNextManualAction({
      preferredChannel,
      phone,
      email,
    }),
  }
}
