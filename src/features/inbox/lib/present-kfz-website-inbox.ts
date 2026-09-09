/**
 * Operator-facing facts for a Kfz website inbox working copy.
 * Reads the existing normalized inbound item — no CRM, no AI, no side effects.
 */

import { isKfzInboxItem, isKfzWebsiteInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { getInboxListTitle } from '@/features/inbox/lib/format-inbox-content'
import {
  buildKfzNextManualAction,
  listKfzManualTriageActions,
  resolveKfzTriagePhase,
  type KfzManualTriageAction,
  type KfzTriagePhase,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  getManualCaptureOriginKindLabel,
  readManualCaptureOriginKind,
} from '@/features/inbound/manual/lib/manual-capture-origin'
import { MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE } from '@/features/inbound/manual/lib/manual-capture-copy'
import {
  hasKfzResponseDraft,
  readInboxSourceContent,
  readKfzResponseDraft,
} from '@/features/inbox/lib/kfz-response-draft'
import {
  buildKfzCallPreparation,
  buildKfzReplyHandoffView,
  labelKfzPreferredChannel,
  readKfzCopyTargets,
  resolvePreferredChannelContact,
  type KfzCallPreparation,
  type KfzCopyTargets,
  type KfzPreferredChannelContact,
  type KfzReplyHandoffView,
} from '@/features/inbox/lib/kfz-reply-handoff'
import { labelKfzUploadGroup } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  KFZ_UPLOAD_GROUPS,
  type KfzUploadGroup,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export { KFZ_REVIEW_NO_AUTO_ACTION } from '@/features/inbox/lib/kfz-inbox-manual-triage'

export const KFZ_WEBSITE_SOURCE_LABEL = 'Website · Kfz' as const

export const KFZ_REVIEW_FACT_LABEL = 'Bestand aus dem Eingang' as const
export const KFZ_REVIEW_AI_SEPARATE_LABEL =
  'KI bleibt ein getrennter Vorschlag — keine Tatsachenfeststellung.' as const

export const KFZ_URGENCY_FACTUAL_NOTE =
  'Anliegen nennt Unfall, Schaden oder Eilhinweis — bitte vorrangig manuell prüfen.' as const

export const KFZ_URGENCY_NONE_NOTE =
  'Kein Unfall- oder Schadenhinweis in den Angaben.' as const

export type KfzSubmittedFact = {
  id: string
  label: string
  value: string
}

export type KfzSubmittedDocument = {
  filename: string
  group: KfzUploadGroup | null
  groupLabel: string
  mimeType: string | null
  sizeBytes: number | null
}

export type KfzMissingInfoCheckId =
  | 'contact'
  | 'preferred_channel_contact'
  | 'request'
  | 'vehicle'
  | 'location'

export type KfzMissingInfoCheck = {
  id: KfzMissingInfoCheckId
  label: string
  present: boolean
}

export type KfzWebsiteInboxReview = {
  headline: string
  sourceLabel: string
  acquisitionSource: string | null
  customerName: string
  location: string | null
  phone: string | null
  email: string | null
  preferredChannelLabel: string
  preferredChannel: string | null
  request: string
  vehicle: string | null
  contextNotes: string | null
  factualSummary: string
  listSummary: string
  submittedFacts: KfzSubmittedFact[]
  documents: KfzSubmittedDocument[]
  missingInformationChecklist: KfzMissingInfoCheck[]
  missingInformation: string[]
  missingCount: number
  missingCountLabel: string
  urgencyNote: string
  hasFactualUrgency: boolean
  nextManualAction: string
  phase: KfzTriagePhase
  availableActions: KfzManualTriageAction[]
  sourceContent: string
  responseDraft: string
  hasResponseDraft: boolean
  preferredChannelContact: KfzPreferredChannelContact
  copyTargets: KfzCopyTargets
  callPreparation: KfzCallPreparation
  replyHandoff: KfzReplyHandoffView
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

function detectUrgencyNote(reason: string | null, notes: string | null): string {
  const text = `${reason ?? ''} ${notes ?? ''}`.toLowerCase()
  if (/unfall|schaden|abschlepp|airbag|notfall|sofort|dringend/.test(text)) {
    return KFZ_URGENCY_FACTUAL_NOTE
  }
  return KFZ_URGENCY_NONE_NOTE
}

function contactValue(phone: string | null, email: string | null): string | null {
  const parts = [phone, email].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(' · ') : null
}

export function labelKfzMissingCount(count: number): string {
  if (count <= 0) {
    return 'Angaben vollständig'
  }
  if (count === 1) {
    return '1 Angabe fehlt'
  }
  return `${count} Angaben fehlen`
}

export function buildKfzMissingInformationChecklist(input: {
  phone: string | null
  email: string | null
  preferredChannel: string | null
  reason: string | null
  vehicle: string | null
  location: string | null
}): KfzMissingInfoCheck[] {
  const checklist: KfzMissingInfoCheck[] = [
    {
      id: 'contact',
      label: 'Erreichbarkeit (Telefon oder E-Mail)',
      present: Boolean(input.phone || input.email),
    },
  ]

  if (input.phone || input.email) {
    if (input.preferredChannel === 'phone' || input.preferredChannel === 'whatsapp') {
      checklist.push({
        id: 'preferred_channel_contact',
        label: 'Telefonnummer für den bevorzugten Kanal',
        present: Boolean(input.phone),
      })
    } else if (input.preferredChannel === 'email') {
      checklist.push({
        id: 'preferred_channel_contact',
        label: 'E-Mail-Adresse für den bevorzugten Kanal',
        present: Boolean(input.email),
      })
    }
  }

  checklist.push(
    {
      id: 'request',
      label: 'Konkretes Anliegen',
      present: Boolean(input.reason),
    },
    {
      id: 'vehicle',
      label: 'Fahrzeugdaten (Marke/Modell/Jahr — falls relevant)',
      present: Boolean(input.vehicle),
    },
    {
      id: 'location',
      label: 'Ort / PLZ',
      present: Boolean(input.location),
    },
  )

  return checklist
}

export function buildKfzFactualSummary(input: {
  customerName: string
  location: string | null
  request: string
  vehicle: string | null
  phone: string | null
  email: string | null
  preferredChannelLabel: string
}): string {
  const who = input.location
    ? `${input.customerName} aus ${input.location}`
    : input.customerName
  const request =
    input.request && input.request !== 'Nicht angegeben'
      ? `Anliegen: ${input.request}`
      : 'Anliegen nicht angegeben'
  const parts = [who, request]

  if (input.vehicle) {
    parts.push(`Fahrzeug: ${input.vehicle}`)
  }

  const contact = contactValue(input.phone, input.email)
  if (contact) {
    const channel =
      input.preferredChannelLabel !== 'Nicht angegeben'
        ? ` (${input.preferredChannelLabel})`
        : ''
    parts.push(`Kontakt: ${contact}${channel}`)
  }

  return `${parts.join('. ')}.`
}

export function buildKfzListSummary(input: {
  request: string
  vehicle: string | null
}): string {
  const request =
    input.request && input.request !== 'Nicht angegeben'
      ? input.request
      : 'Anliegen nicht angegeben'
  return input.vehicle ? `${request} · ${input.vehicle}` : request
}

function buildSubmittedFacts(input: {
  sourceLabel: string
  acquisitionSource: string | null
  classification?: string | null
  customerName: string
  location: string | null
  phone: string | null
  email: string | null
  preferredChannelLabel: string
  request: string
  vehicle: string | null
  contextNotes: string | null
  documents: KfzSubmittedDocument[]
}): KfzSubmittedFact[] {
  const facts: KfzSubmittedFact[] = [
    {
      id: 'source',
      label: 'Quelle',
      value: input.acquisitionSource
        ? `${input.sourceLabel} · ${input.acquisitionSource}`
        : input.sourceLabel,
    },
  ]

  if (input.classification) {
    facts.push({
      id: 'classification',
      label: 'Einordnung',
      value: input.classification,
    })
  }

  facts.push({
    id: 'customer',
    label: 'Kunde',
    value: input.customerName,
  })

  if (input.location) {
    facts.push({ id: 'location', label: 'Ort', value: input.location })
  }

  const contact = contactValue(input.phone, input.email)
  if (contact) {
    facts.push({ id: 'contact', label: 'Kontakt', value: contact })
  }

  if (input.preferredChannelLabel !== 'Nicht angegeben') {
    facts.push({
      id: 'preferred_channel',
      label: 'Bevorzugter Kanal',
      value: input.preferredChannelLabel,
    })
  }

  if (input.request && input.request !== 'Nicht angegeben') {
    facts.push({ id: 'request', label: 'Anliegen', value: input.request })
  }

  if (input.vehicle) {
    facts.push({ id: 'vehicle', label: 'Fahrzeug', value: input.vehicle })
  }

  if (input.contextNotes) {
    facts.push({ id: 'notes', label: 'Kontext', value: input.contextNotes })
  }

  if (input.documents.length > 0) {
    facts.push({
      id: 'documents',
      label: 'Dokumente',
      value: input.documents
        .map((doc) => `${doc.groupLabel}: ${doc.filename}`)
        .join(' · '),
    })
  }

  return facts
}

function readSubmittedDocuments(meta: Record<string, unknown> | null): KfzSubmittedDocument[] {
  if (!meta || !Array.isArray(meta.uploadMeta)) {
    return []
  }

  const documents: KfzSubmittedDocument[] = []
  for (const entry of meta.uploadMeta) {
    if (!isRecord(entry)) {
      continue
    }
    const filename = asNullableString(entry.filename)
    if (!filename) {
      continue
    }
    const groupRaw = asNullableString(entry.group)
    const group =
      groupRaw && (KFZ_UPLOAD_GROUPS as readonly string[]).includes(groupRaw)
        ? (groupRaw as KfzUploadGroup)
        : null
    documents.push({
      filename,
      group,
      groupLabel: labelKfzUploadGroup(group),
      mimeType: asNullableString(entry.mimeType),
      sizeBytes:
        typeof entry.sizeBytes === 'number' && Number.isFinite(entry.sizeBytes)
          ? entry.sizeBytes
          : null,
    })
  }
  return documents
}

function readOriginName(origin: InboxItem['origin'] | undefined): string | null {
  if (!isRecord(origin)) {
    return null
  }
  return asNullableString(origin.displayName)
}

function readOriginContact(origin: InboxItem['origin'] | undefined): {
  phone: string | null
  email: string | null
} {
  if (!isRecord(origin)) {
    return { phone: null, email: null }
  }

  const address = asNullableString(origin.address)
  if (!address) {
    return { phone: null, email: null }
  }

  const kind = asNullableString(origin.addressKind)
  if (kind === 'email' || address.includes('@')) {
    return { phone: null, email: address }
  }
  if (kind === 'phone') {
    return { phone: address, email: null }
  }

  return { phone: null, email: null }
}

function resolveKfzReviewSourceLabel(
  item: Pick<InboxItem, 'channel' | 'source' | 'inbound_metadata' | 'title' | 'content'>,
): string {
  if (isKfzWebsiteInboxItem(item)) {
    return KFZ_WEBSITE_SOURCE_LABEL
  }

  const originKind = readManualCaptureOriginKind(item.inbound_metadata)
  if (originKind) {
    return getManualCaptureOriginKindLabel(originKind)
  }

  return 'Manuell'
}

/**
 * Builds a factual review model from the persisted inbox working copy.
 * Returns null when the item is not a Kfz website or explicitly marked manual Kfz inquiry.
 */
export function presentKfzWebsiteInboxItem(
  item: Pick<
    InboxItem,
    'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'sender'
  > & {
    processed_at?: string | null
    origin?: InboxItem['origin']
  },
  options?: { linkedTaskId?: string | null },
): KfzWebsiteInboxReview | null {
  if (!isKfzInboxItem(item)) {
    return null
  }

  const websiteItem = isKfzWebsiteInboxItem(item)
  const sourceLabel = resolveKfzReviewSourceLabel(item)
  const classification = websiteItem ? null : MANUAL_CAPTURE_KFZ_CLASSIFICATION_VALUE
  const meta = isRecord(item.inbound_metadata) ? item.inbound_metadata : null
  const acquisition = meta && isRecord(meta.acquisition) ? meta.acquisition : null
  const inquiry = meta && isRecord(meta.inquiry) ? meta.inquiry : null
  const location = inquiry && isRecord(inquiry.location) ? inquiry.location : null
  const vehicle = inquiry && isRecord(inquiry.vehicle) ? inquiry.vehicle : null
  const originContact = readOriginContact(item.origin)

  const phone = asNullableString(inquiry?.phone) ?? originContact.phone
  const email = asNullableString(inquiry?.email) ?? originContact.email
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
    asNullableString(inquiry?.fullName) ??
    readOriginName(item.origin) ??
    readSenderName(item.sender) ??
    asNullableString(item.title?.replace(/^kfz-anfrage\s*·\s*/i, '')) ??
    'Unbekannt'
  const request = reason ?? 'Nicht angegeben'
  const preferredChannelLabel = labelKfzPreferredChannel(preferredChannel)
  const preferredChannelContact = resolvePreferredChannelContact({
    preferredChannel,
    phone,
    email,
  })
  const missingInformationChecklist = buildKfzMissingInformationChecklist({
    phone,
    email,
    preferredChannel,
    reason,
    vehicle: vehicleLabel,
    location: locationLabel,
  })
  const missingInformation = missingInformationChecklist
    .filter((itemCheck) => !itemCheck.present)
    .map((itemCheck) => itemCheck.label)
  const missingCount = missingInformation.length
  const urgencyNote = detectUrgencyNote(reason, contextNotes)
  const acquisitionSource = websiteItem ? asNullableString(acquisition?.source) : null
  const documents = readSubmittedDocuments(meta)

  return {
    headline: getInboxListTitle(item),
    sourceLabel,
    acquisitionSource,
    customerName,
    location: locationLabel,
    phone,
    email,
    preferredChannelLabel,
    preferredChannel,
    request,
    vehicle: vehicleLabel,
    contextNotes,
    factualSummary: buildKfzFactualSummary({
      customerName,
      location: locationLabel,
      request,
      vehicle: vehicleLabel,
      phone,
      email,
      preferredChannelLabel,
    }),
    listSummary: buildKfzListSummary({
      request,
      vehicle: vehicleLabel,
    }),
    submittedFacts: buildSubmittedFacts({
      sourceLabel,
      acquisitionSource,
      classification,
      customerName,
      location: locationLabel,
      phone,
      email,
      preferredChannelLabel,
      request,
      vehicle: vehicleLabel,
      contextNotes,
      documents,
    }),
    documents,
    missingInformationChecklist,
    missingInformation,
    missingCount,
    missingCountLabel: labelKfzMissingCount(missingCount),
    urgencyNote,
    hasFactualUrgency: urgencyNote === KFZ_URGENCY_FACTUAL_NOTE,
    nextManualAction: buildKfzNextManualAction(
      { content: item.content, processed_at: item.processed_at ?? null },
      options?.linkedTaskId ?? null,
      missingCount,
    ),
    phase: resolveKfzTriagePhase(
      { content: item.content, processed_at: item.processed_at ?? null },
      options?.linkedTaskId ?? null,
    ),
    availableActions: listKfzManualTriageActions(
      { content: item.content, processed_at: item.processed_at ?? null },
      options?.linkedTaskId ?? null,
    ),
    sourceContent: readInboxSourceContent(item.content),
    responseDraft: readKfzResponseDraft(item.content),
    hasResponseDraft: hasKfzResponseDraft(item.content),
    preferredChannelContact,
    copyTargets: readKfzCopyTargets({
      phone,
      email,
      preferredContact: preferredChannelContact.contactValue,
      content: item.content,
    }),
    callPreparation: buildKfzCallPreparation({
      preferredChannel,
      customerName,
      phone,
      location: locationLabel,
      request,
      vehicle: vehicleLabel,
      missingInformation,
    }),
    replyHandoff: buildKfzReplyHandoffView(
      { content: item.content, processed_at: item.processed_at ?? null },
      preferredChannel,
    ),
  }
}
