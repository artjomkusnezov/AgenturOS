/**
 * Local fixtures for the unified daily inbox (Kfz + manual phone / email / note).
 * Not production inbox data and not a customer send path.
 */

import { buildKfzWorkQueuePreviewItems } from '@/features/inbox/lib/kfz-work-queue-preview'
import { buildManualCapturePreviewInboxItem } from '@/features/inbound/manual/lib/manual-capture-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const UNIFIED_INBOX_PREVIEW_PATH = '/dev/inbox' as const

export const UNIFIED_INBOX_PREVIEW_PHONE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31'
export const UNIFIED_INBOX_PREVIEW_EMAIL_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32'
export const UNIFIED_INBOX_PREVIEW_NOTE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa33'
export const UNIFIED_INBOX_PREVIEW_OTHER_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa34'
export const UNIFIED_INBOX_PREVIEW_PHONE_KFZ_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa35'

function requirePreviewItem(
  built: InboxItem | { error: string },
  id: string,
): InboxItem {
  if ('error' in built) {
    throw new Error(built.error)
  }

  return { ...built, id }
}

function buildOtherEmailItem(): InboxItem {
  return {
    id: UNIFIED_INBOX_PREVIEW_OTHER_ID,
    agency_id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    channel: 'email',
    source: 'email',
    title: 'Police zur Unterschrift',
    content: 'Bitte die Hausrat-Police prüfen und zurücksenden.',
    processed_at: null,
    inbound_metadata: {},
    sender: {
      displayName: 'Hausrat Service',
      address: 'service@example.com',
      addressKind: 'email',
    },
    origin: {
      displayName: 'Familie Weber',
      address: 'weber@example.com',
      addressKind: 'email',
    },
    detected_language: 'de',
    external_id: 'email:preview-other',
    message_kind: 'text',
    received_at: '2026-09-08T09:40:00.000Z',
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
    created_at: '2026-09-08T09:40:00.000Z',
    updated_at: '2026-09-08T09:40:00.000Z',
  }
}

/**
 * Safe local mix: website Kfz queue + phone / pasted email / own note + other mail.
 */
export function buildUnifiedInboxPreviewItems(): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId: Record<string, string>
} {
  const kfz = buildKfzWorkQueuePreviewItems()

  const phone = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: [
        'Rückruf Kunde Berger',
        'Bitte wegen bestehender Haftpflicht anrufen.',
        'Telefon: +491701112233',
      ].join('\n'),
      originKind: 'phone_call',
      title: 'Rückruf Kunde Berger',
      origin: {
        displayName: 'Kunde Berger',
        address: '+491701112233',
        addressKind: 'phone',
      },
      capturedAt: '2026-09-08T09:10:00.000Z',
      externalId: 'manual:preview-phone',
    }),
    UNIFIED_INBOX_PREVIEW_PHONE_ID,
  )

  const pastedEmail = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: [
        'Von: lisa@example.com',
        'Betreff: Unterlagen Wohngebäude',
        'Anbei die angeforderten Unterlagen zur Wohngebäudeversicherung.',
      ].join('\n'),
      originKind: 'pasted_email',
      title: 'Unterlagen Wohngebäude',
      origin: {
        displayName: 'Lisa Beispiel',
        address: 'lisa@example.com',
        addressKind: 'email',
      },
      capturedAt: '2026-09-08T09:20:00.000Z',
      externalId: 'manual:preview-email',
    }),
    UNIFIED_INBOX_PREVIEW_EMAIL_ID,
  )

  const ownNote = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: 'Eigene Notiz: morgen Akte Schmidt auf Vollständigkeit prüfen.',
      originKind: 'personal_note',
      title: 'Akte Schmidt prüfen',
      capturedAt: '2026-09-08T09:30:00.000Z',
      externalId: 'manual:preview-note',
    }),
    UNIFIED_INBOX_PREVIEW_NOTE_ID,
  )

  const phoneKfz = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: [
        'Telefonat mit Anna Kfz',
        'Wechsel Kfz-Versicherung, VW Golf 2019.',
        'Telefon: +491709998877',
        'Ort: 49525 Lengerich',
      ].join('\n'),
      originKind: 'phone_call',
      title: 'Kfz-Anruf Anna',
      origin: {
        displayName: 'Anna Kfz',
        address: '+491709998877',
        addressKind: 'phone',
      },
      capturedAt: '2026-09-08T09:05:00.000Z',
      externalId: 'manual:preview-phone-kfz',
      kfzCase: true,
      kfz: {
        fullName: 'Anna Kfz',
        phone: '+491709998877',
        inquiryReason: 'Wechsel Kfz-Versicherung',
        postalCode: '49525',
        city: 'Lengerich',
        vehicleMake: 'VW',
        vehicleModel: 'Golf',
        vehicleYear: '2019',
        preferredChannel: 'phone',
      },
    }),
    UNIFIED_INBOX_PREVIEW_PHONE_KFZ_ID,
  )

  return {
    unprocessedItems: [
      ...kfz.unprocessedItems,
      phoneKfz,
      phone,
      pastedEmail,
      ownNote,
      buildOtherEmailItem(),
    ],
    processedItems: kfz.processedItems,
    taskRelationsByItemId: kfz.taskRelationsByItemId,
  }
}
