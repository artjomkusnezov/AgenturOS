/**
 * Local fixtures for the preferred-channel reply handoff preview.
 * Not production inbox data and not a customer send path.
 */

import { composeInboxWorkingCopy } from '@/features/inbox/lib/kfz-response-draft'
import { KFZ_REVIEW_STARTED_NOTE } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

export const KFZ_REPLY_HANDOFF_PREVIEW_PATH = '/dev/kfz-reply-handoff' as const

export const KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY =
  'agenturos:kfz-reply-handoff-preview' as const

export const KFZ_REPLY_HANDOFF_PREVIEW_WHATSAPP_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab01'
export const KFZ_REPLY_HANDOFF_PREVIEW_PHONE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab02'
export const KFZ_REPLY_HANDOFF_PREVIEW_EMAIL_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab03'
export const KFZ_REPLY_HANDOFF_PREVIEW_MISSING_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab04'

type PreviewInquiry = {
  id: string
  name: string
  reason: string
  phone: string | null
  email: string | null
  preferredChannel: 'phone' | 'email' | 'whatsapp'
  vehicle: { make: string | null; model: string | null; year: string | null }
  notes: string
  draft: string
  processedAt: string | null
  createdAt: string
  contextNotes?: string
}

function buildPreviewItem(input: PreviewInquiry): InboxItem {
  const vehicleLabel = [input.vehicle.make, input.vehicle.model, input.vehicle.year]
    .filter(Boolean)
    .join(' ')
  const source = [
    `Kfz-Anfrage von ${input.name}`,
    'Ort: 49525 Lengerich',
    `Anliegen: ${input.reason}`,
    `Bevorzugter Kanal: ${input.preferredChannel}`,
    input.phone ? `Telefon: ${input.phone}` : null,
    input.email ? `E-Mail: ${input.email}` : null,
    vehicleLabel ? `Fahrzeug: ${vehicleLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    id: input.id,
    agency_id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    channel: 'website',
    source: 'website',
    title: `Kfz-Anfrage · ${input.name}`,
    content: composeInboxWorkingCopy({
      source,
      draft: input.draft,
      notes: input.notes,
    }),
    processed_at: input.processedAt,
    created_at: input.createdAt,
    updated_at: input.createdAt,
    received_at: input.createdAt,
    external_id: `kfz:preview-handoff-${input.id.slice(-2)}`,
    origin: null,
    message_kind: 'text',
    detected_language: 'de',
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
    sender: {
      displayName: input.name,
      address: input.phone ?? input.email ?? '',
      addressKind: input.phone ? 'phone' : 'email',
    },
    inbound_metadata: {
      acquisition: { family: 'website', product: 'kfz', source: 'kfz.artkus.de' },
      inquiry: {
        reason: input.reason,
        preferredChannel: input.preferredChannel,
        phone: input.phone,
        email: input.email,
        contextNotes: input.contextNotes ?? null,
        location: { postalCode: '49525', city: 'Lengerich' },
        vehicle: input.vehicle,
      },
      consent: {
        purpose: 'inquiry_processing',
        granted: true,
        version: 'kfz-landing-v1',
        consentedAt: input.createdAt,
        receivedAt: input.createdAt,
      },
    } as Json,
  }
}

export function buildKfzReplyHandoffPreviewItems(): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId: Record<string, string>
} {
  const whatsapp = buildPreviewItem({
    id: KFZ_REPLY_HANDOFF_PREVIEW_WHATSAPP_ID,
    name: 'Max Mustermann',
    reason: 'Wechsel Kfz-Versicherung',
    phone: '+491701234567',
    email: null,
    preferredChannel: 'whatsapp',
    vehicle: { make: 'VW', model: 'Golf', year: '2019' },
    notes: KFZ_REVIEW_STARTED_NOTE,
    draft: 'Guten Tag, wir haben Ihre Kfz-Anfrage intern aufgenommen.',
    processedAt: null,
    createdAt: '2026-09-08T09:10:00.000Z',
  })

  const phone = buildPreviewItem({
    id: KFZ_REPLY_HANDOFF_PREVIEW_PHONE_ID,
    name: 'Anna Beispiel',
    reason: 'Wechsel Kfz-Versicherung',
    phone: '+491709998877',
    email: null,
    preferredChannel: 'phone',
    vehicle: { make: 'Opel', model: 'Corsa', year: '2018' },
    notes: KFZ_REVIEW_STARTED_NOTE,
    draft: 'Guten Tag, intern vorbereiteter Rückruf — nicht senden.',
    processedAt: null,
    createdAt: '2026-09-08T09:20:00.000Z',
  })

  const email = buildPreviewItem({
    id: KFZ_REPLY_HANDOFF_PREVIEW_EMAIL_ID,
    name: 'Lisa Mailer',
    reason: 'Preischeck Kfz-Versicherung',
    phone: null,
    email: 'lisa@example.com',
    preferredChannel: 'email',
    vehicle: { make: 'BMW', model: '320d', year: '2020' },
    notes: KFZ_REVIEW_STARTED_NOTE,
    draft: 'Guten Tag, intern vorbereitete E-Mail — nicht senden.',
    processedAt: null,
    createdAt: '2026-09-08T09:30:00.000Z',
  })

  const missing = buildPreviewItem({
    id: KFZ_REPLY_HANDOFF_PREVIEW_MISSING_ID,
    name: 'Paul Lücke',
    reason: 'Unfall Kfz-Versicherung',
    phone: null,
    email: 'paul@example.com',
    preferredChannel: 'phone',
    vehicle: { make: null, model: null, year: null },
    notes: KFZ_REVIEW_STARTED_NOTE,
    draft: '',
    processedAt: null,
    createdAt: '2026-09-08T09:40:00.000Z',
    contextNotes: 'Sofort nach Schaden melden',
  })

  return {
    unprocessedItems: [whatsapp, phone, email, missing],
    processedItems: [],
    taskRelationsByItemId: {},
  }
}

export function splitKfzReplyHandoffPreviewItems(items: InboxItem[]): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
} {
  return {
    unprocessedItems: items.filter((item) => item.processed_at === null),
    processedItems: items.filter((item) => item.processed_at !== null),
  }
}

export function listKfzReplyHandoffPreviewItems(snapshot: {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
}): InboxItem[] {
  return [...snapshot.unprocessedItems, ...snapshot.processedItems]
}
