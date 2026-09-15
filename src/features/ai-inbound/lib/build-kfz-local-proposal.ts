/**
 * Deterministic Kfz website triage proposal from normalized inbound metadata.
 * Advisory only — no prices, tariffs, coverage promises, or invented facts.
 */

import type {
  InboundAnalysisInput,
  InboundAnalysisPurchaseIntent,
  InboundAnalysisSuggestion,
  InboundAnalysisUrgency,
} from '@/features/ai/inbound-analysis'

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

type InquirySlice = {
  reason: string | null
  preferredChannel: string | null
  language: string | null
  phone: string | null
  email: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  contextNotes: string | null
  postalCode: string | null
  city: string | null
}

function readInquiry(metadata: Record<string, unknown> | null): InquirySlice {
  const inquiry = metadata && isRecord(metadata.inquiry) ? metadata.inquiry : null
  const location =
    inquiry && isRecord(inquiry.location) ? inquiry.location : null
  const vehicle =
    inquiry && isRecord(inquiry.vehicle) ? inquiry.vehicle : null

  return {
    reason: asNullableString(inquiry?.reason),
    preferredChannel: asNullableString(inquiry?.preferredChannel),
    language: asNullableString(inquiry?.language),
    phone: asNullableString(inquiry?.phone),
    email: asNullableString(inquiry?.email),
    vehicleMake: asNullableString(vehicle?.make),
    vehicleModel: asNullableString(vehicle?.model),
    vehicleYear: asNullableString(vehicle?.year),
    contextNotes: asNullableString(inquiry?.contextNotes),
    postalCode: asNullableString(location?.postalCode),
    city: asNullableString(location?.city),
  }
}

function productFromMetadata(
  metadata: Record<string, unknown> | null,
): string {
  if (metadata && isRecord(metadata.acquisition) && metadata.acquisition.product === 'kfz') {
    return 'Kfz'
  }
  return 'unclear'
}

function detectUrgency(reason: string | null, notes: string | null): InboundAnalysisUrgency {
  const text = `${reason ?? ''} ${notes ?? ''}`.toLowerCase()
  if (
    /unfall|schaden|abschlepp|airbag|notfall|sofort|dringend|hilfe/.test(text)
  ) {
    return 'high'
  }
  return 'normal'
}

function detectPurchaseIntent(
  reason: string | null,
): InboundAnalysisPurchaseIntent {
  const text = (reason ?? '').toLowerCase()
  if (!text) {
    return 'unclear'
  }
  if (/preis|angebot|wechsel|neu|versicherung|tarif|vergleich|check/.test(text)) {
    return 'possible'
  }
  if (/schaden|unfall|schadenmeldung/.test(text)) {
    return 'none'
  }
  return 'unclear'
}

function detectIntent(reason: string | null): InboundAnalysisSuggestion['intent'] {
  const text = (reason ?? '').toLowerCase()
  if (/schaden|unfall|schadenmeldung/.test(text)) {
    return 'claim'
  }
  if (/preis|angebot|wechsel|neu|versicherung|tarif|vergleich|check|anfrage/.test(text)) {
    return 'new_business'
  }
  if (!text) {
    return 'unclear'
  }
  return 'new_business'
}

function collectMissing(inquiry: InquirySlice): string[] {
  const missing: string[] = []

  if (!inquiry.phone && !inquiry.email) {
    missing.push('Erreichbarkeit (Telefon oder E-Mail)')
  } else if (
    (inquiry.preferredChannel === 'phone' || inquiry.preferredChannel === 'whatsapp') &&
    !inquiry.phone
  ) {
    missing.push('Telefonnummer für den bevorzugten Kanal')
  } else if (inquiry.preferredChannel === 'email' && !inquiry.email) {
    missing.push('E-Mail-Adresse für den bevorzugten Kanal')
  }

  if (!inquiry.reason) {
    missing.push('Konkretes Anliegen / inquiryReason')
  }

  if (!inquiry.vehicleMake && !inquiry.vehicleModel && !inquiry.vehicleYear) {
    missing.push('Fahrzeugdaten (Marke/Modell/Jahr — falls relevant)')
  }

  if (!inquiry.postalCode || !inquiry.city) {
    missing.push('Ort / PLZ')
  }

  return missing
}

function buildDraftReply(inquiry: InquirySlice): string {
  const channelHint =
    inquiry.preferredChannel === 'email'
      ? 'per E-Mail'
      : inquiry.preferredChannel === 'whatsapp'
        ? 'per WhatsApp'
        : inquiry.preferredChannel === 'phone'
          ? 'telefonisch'
          : 'über Ihren gewünschten Kanal'

  return [
    'Vielen Dank für Ihre Anfrage zur Kfz-Versicherung.',
    `Wir melden uns in Kürze ${channelHint}.`,
    'Bitte haben Sie Verständnis, dass dies ein Entwurf zur internen Vorbereitung ist — keine verbindliche Auskunft und kein Angebot.',
  ].join(' ')
}

function buildNextStep(inquiry: InquirySlice): NonNullable<
  InboundAnalysisSuggestion['suggestedTask']
> {
  if (inquiry.preferredChannel === 'email' && inquiry.email) {
    return {
      title: 'Kfz-Website-Anfrage per E-Mail beantworten',
      reason: 'Bevorzugter Kanal laut Anfrage: E-Mail (Vorschlag, nicht ausgeführt).',
      priority: 'normal',
    }
  }
  if (inquiry.preferredChannel === 'whatsapp' && inquiry.phone) {
    return {
      title: 'Kfz-Website-Anfrage per WhatsApp aufnehmen',
      reason: 'Bevorzugter Kanal laut Anfrage: WhatsApp (Vorschlag, nicht ausgeführt).',
      priority: 'normal',
    }
  }
  if (inquiry.phone) {
    return {
      title: 'Kfz-Website-Anfrage telefonisch rückrufen',
      reason: 'Kontaktaufnahme vorschlagen — kein automatischer Anruf.',
      priority: 'normal',
    }
  }
  return {
    title: 'Kfz-Website-Anfrage manuell prüfen und Kontakt wählen',
    reason: 'Erreichbarkeit oder Kanal unklar — menschliche Entscheidung nötig.',
    priority: 'normal',
  }
}

/**
 * Builds a local, deterministic suggestion object for Kfz website leads.
 * Output must still pass parseInboundAnalysisSuggestion / analyzeInboundItem.
 */
export function buildKfzLocalProposal(
  input: InboundAnalysisInput,
): InboundAnalysisSuggestion {
  const metadata = isRecord(input.metadata) ? input.metadata : null
  const inquiry = readInquiry(metadata)
  const productTopic = productFromMetadata(metadata)
  const intent = detectIntent(inquiry.reason)
  const urgency = detectUrgency(inquiry.reason, inquiry.contextNotes)
  const purchaseIntent = detectPurchaseIntent(inquiry.reason)
  const missingInformation = collectMissing(inquiry)

  const sensitive =
    urgency === 'high' ||
    intent === 'claim' ||
    productTopic === 'unclear' ||
    (!inquiry.phone && !inquiry.email) ||
    missingInformation.includes('Konkretes Anliegen / inquiryReason')

  const channelMismatch =
    (inquiry.preferredChannel === 'email' && !inquiry.email) ||
    ((inquiry.preferredChannel === 'phone' ||
      inquiry.preferredChannel === 'whatsapp') &&
      !inquiry.phone)

  const humanReviewRequired = sensitive || channelMismatch || missingInformation.length >= 2

  const reasonLabel = inquiry.reason ?? 'Anliegen nicht angegeben'
  const summary = [
    'Website-Kfz-Anfrage',
    productTopic === 'Kfz' ? '(Produkt: Kfz)' : '(Produkt unklar)',
    `— ${reasonLabel}.`,
    'Einordnung ist ein interner Vorschlag, keine Tatsachenfeststellung.',
  ].join(' ')

  return {
    summary,
    intent,
    productTopic,
    urgency,
    missingInformation,
    purchaseIntent,
    suggestedCaseAction: 'none',
    suggestedTask: buildNextStep(inquiry),
    suggestedReplyDraft: buildDraftReply(inquiry),
    humanReviewRequired,
    humanReviewReason: humanReviewRequired
      ? sensitive || channelMismatch
        ? 'Ambige, unvollständige oder risikorelevante Angaben — menschliche Übernahme empfohlen.'
        : 'Mehrere fehlende Informationen — bitte manuell prüfen.'
      : null,
    confidence: humanReviewRequired ? 0.45 : 0.72,
  }
}
