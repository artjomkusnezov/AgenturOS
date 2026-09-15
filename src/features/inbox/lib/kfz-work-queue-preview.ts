/**
 * Local fixtures for the daily Kfz inquiry work-queue preview.
 * Not production inbox data and not a customer send path.
 */

import {
  INBOX_HISTORY_LIMITATION,
  LOCAL_REVIEW_HISTORY_FIXTURE_KEY,
} from '@/features/inbox/lib/inbox-manual-review-history'
import { composeInboxWorkingCopy } from '@/features/inbox/lib/kfz-response-draft'
import { KFZ_REVIEW_STARTED_NOTE } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

/** Documented local-only employee times. Live working copies do not store these. */
export const KFZ_WORK_QUEUE_PREVIEW_REVIEW_NOTE =
  'Rückfrage intern notiert: Kennzeichen liegt vor.' as const

export const KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS = {
  documentedLimitation: INBOX_HISTORY_LIMITATION,
  reviewStartedAt: '2026-09-08T07:35:00.000Z',
  noteSavedAtByIndex: ['2026-09-08T07:40:00.000Z'],
  draftSavedAt: '2026-09-08T07:42:00.000Z',
  taskCreatedAt: '2026-09-08T07:45:00.000Z',
} as const

export const KFZ_WORK_QUEUE_PREVIEW_DONE_HISTORY_FACTS = {
  documentedLimitation: INBOX_HISTORY_LIMITATION,
  reviewStartedAt: '2026-09-08T07:10:00.000Z',
} as const

export const KFZ_WORK_QUEUE_PREVIEW_PATH = '/dev/kfz-work-queue' as const

export const KFZ_WORK_QUEUE_PREVIEW_NEW_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
export const KFZ_WORK_QUEUE_PREVIEW_MISSING_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02'
export const KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03'
export const KFZ_WORK_QUEUE_PREVIEW_DONE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04'
export const KFZ_WORK_QUEUE_PREVIEW_TASK_ID =
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03'

type PreviewInquiry = {
  id: string
  name: string
  reason: string
  phone: string | null
  email: string | null
  preferredChannel: 'phone' | 'email' | 'whatsapp'
  uploadMeta?: Array<{
    filename: string
    mimeType?: string | null
    sizeBytes?: number | null
    group?: 'fahrzeugschein' | 'vorversicherung' | null
  }>
  vehicle: { make: string | null; model: string | null; year: string | null; registration?: string | null }
  notes: string
  draft: string
  processedAt: string | null
  createdAt: string
  contextNotes?: string
  localReviewHistory?: Record<string, unknown>
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
    input.vehicle.registration ? `Kennzeichen: ${input.vehicle.registration}` : null,
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
    external_id: `kfz:preview-queue-${input.id.slice(-2)}`,
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
        vehicle: {
          make: input.vehicle.make,
          model: input.vehicle.model,
          year: input.vehicle.year,
          ...(input.vehicle.registration
            ? { registration: input.vehicle.registration }
            : {}),
        },
      },
      ...(input.uploadMeta && input.uploadMeta.length > 0
        ? { uploadMeta: input.uploadMeta }
        : {}),
      ...(input.localReviewHistory
        ? { [LOCAL_REVIEW_HISTORY_FIXTURE_KEY]: input.localReviewHistory }
        : {}),
    } as Json,
  }
}

export function buildKfzWorkQueuePreviewItems(): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId: Record<string, string>
} {
  const fresh = buildPreviewItem({
    id: KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
    name: 'Max Mustermann',
    reason: 'Wechsel Kfz-Versicherung',
    phone: '+491701234567',
    email: null,
    preferredChannel: 'whatsapp',
    vehicle: { make: 'VW', model: 'Golf', year: '2019', registration: 'OS-AB 1234' },
    notes: '',
    draft: '',
    processedAt: null,
    createdAt: '2026-09-08T07:10:00.000Z',
    contextNotes: 'Kennzeichen OS-AB 1234 liegt vor.',
    uploadMeta: [
      {
        filename: 'fahrzeugschein.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 240_000,
        group: 'fahrzeugschein',
      },
      {
        filename: 'beitragsrechnung.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 82_000,
        group: 'vorversicherung',
      },
    ],
  })

  const missing = buildPreviewItem({
    id: KFZ_WORK_QUEUE_PREVIEW_MISSING_ID,
    name: 'Lisa Unfall',
    reason: 'Unfall Kfz-Versicherung',
    phone: null,
    email: 'lisa@example.com',
    preferredChannel: 'phone',
    vehicle: { make: null, model: null, year: null },
    notes: '',
    draft: '',
    processedAt: null,
    createdAt: '2026-09-08T07:20:00.000Z',
    contextNotes: 'Sofort nach Schaden melden',
  })

  const reviewing = buildPreviewItem({
    id: KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID,
    name: 'Anna Beispiel',
    reason: 'Wechsel Kfz-Versicherung',
    phone: '+491701234567',
    email: null,
    preferredChannel: 'phone',
    vehicle: { make: 'VW', model: 'Golf', year: '2019' },
    notes: `${KFZ_REVIEW_STARTED_NOTE}\n${KFZ_WORK_QUEUE_PREVIEW_REVIEW_NOTE}`,
    draft: 'Guten Tag, intern vorbereiteter Entwurf — nicht senden.',
    processedAt: null,
    createdAt: '2026-09-08T07:30:00.000Z',
    localReviewHistory: KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS,
  })

  const done = buildPreviewItem({
    id: KFZ_WORK_QUEUE_PREVIEW_DONE_ID,
    name: 'Paul Fertig',
    reason: 'Preischeck Kfz-Versicherung',
    phone: '+491709998877',
    email: null,
    preferredChannel: 'phone',
    vehicle: { make: 'Opel', model: 'Corsa', year: '2018', registration: 'OS-AB 1234' },
    notes: KFZ_REVIEW_STARTED_NOTE,
    draft: '',
    processedAt: '2026-09-08T08:00:00.000Z',
    createdAt: '2026-09-08T06:50:00.000Z',
    contextNotes: 'Kennzeichen OS-AB 1234.',
    localReviewHistory: KFZ_WORK_QUEUE_PREVIEW_DONE_HISTORY_FACTS,
  })

  return {
    unprocessedItems: [fresh, missing, reviewing],
    processedItems: [done],
    taskRelationsByItemId: {
      [reviewing.id]: KFZ_WORK_QUEUE_PREVIEW_TASK_ID,
    },
  }
}
