/**
 * Local fixtures for the unified daily inbox (Kfz + manual phone / email / note).
 * Not production inbox data and not a customer send path.
 */

import { buildKfzWorkQueuePreviewItems } from '@/features/inbox/lib/kfz-work-queue-preview'
import { composeInboxWorkingCopy } from '@/features/inbox/lib/kfz-response-draft'
import { KFZ_CONTACTED_NOTE, KFZ_FOLLOW_UP_NOTE } from '@/features/inbox/lib/kfz-reply-handoff'
import { buildManualCapturePreviewInboxItem } from '@/features/inbound/manual/lib/manual-capture-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

export const UNIFIED_INBOX_PREVIEW_PATH = '/dev/inbox' as const

export const UNIFIED_INBOX_PREVIEW_STORAGE_KEY =
  'agenturos:unified-inbox-preview' as const

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
export const UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa36'
export const UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa37'
export const UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa38'
export const UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa39'
export const UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa40'

/** Documented local clock for Heute / Gestern / Älter fixtures (Europe/Berlin). */
export const UNIFIED_INBOX_PREVIEW_NOW = '2026-09-09T12:00:00.000Z' as const

function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString()
}

function buildTodayLandingItem(now: Date): InboxItem {
  const createdAt = hoursAgo(now, 2)
  return {
    id: UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID,
    agency_id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    channel: 'website',
    source: 'website',
    title: 'Kfz-Anfrage · Heute Landing',
    content: [
      'Kfz-Anfrage von Heute Landing',
      'Ort: 49525 Lengerich',
      'Anliegen: Wechsel Kfz-Versicherung',
      'Bevorzugter Kanal: email',
      'E-Mail: heute@example.com',
      'Fahrzeug: VW Golf 2020',
    ].join('\n'),
    processed_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    received_at: createdAt,
    external_id: 'kfz:preview-queue-today',
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
      displayName: 'Heute Landing',
      address: 'heute@example.com',
      addressKind: 'email',
    },
    inbound_metadata: {
      acquisition: { family: 'website', product: 'kfz', source: 'kfz.artkus.de' },
      inquiry: {
        reason: 'Wechsel Kfz-Versicherung',
        preferredChannel: 'email',
        phone: null,
        email: 'heute@example.com',
        contextNotes: null,
        location: { postalCode: '49525', city: 'Lengerich' },
        vehicle: { make: 'VW', model: 'Golf', year: '2020' },
      },
    } as Json,
  }
}

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
export function buildUnifiedInboxPreviewItems(
  now = new Date(UNIFIED_INBOX_PREVIEW_NOW),
): {
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

  const olderPhone = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: [
        'Älterer Rückruf Kunde Altmann',
        'Noch keine Rückmeldung zur Haftpflicht.',
        'Telefon: +491701000111',
      ].join('\n'),
      originKind: 'phone_call',
      title: 'Älterer Rückruf Altmann',
      origin: {
        displayName: 'Kunde Altmann',
        address: '+491701000111',
        addressKind: 'phone',
      },
      capturedAt: hoursAgo(now, 24 * 6),
      externalId: 'manual:preview-older-phone',
    }),
    UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID,
  )

  const contactedEmail = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: [
        'Von: kontaktiert@example.com',
        'Betreff: Wohngebäude Rückfrage',
        'Unterlagen sind angekommen.',
      ].join('\n'),
      originKind: 'pasted_email',
      title: 'Wohngebäude kontaktiert',
      origin: {
        displayName: 'Kontakt Beispiel',
        address: 'kontaktiert@example.com',
        addressKind: 'email',
      },
      capturedAt: hoursAgo(now, 26),
      externalId: 'manual:preview-contacted-email',
    }),
    UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID,
  )
  contactedEmail.content = composeInboxWorkingCopy({
    source: contactedEmail.content,
    draft: '',
    notes: KFZ_CONTACTED_NOTE,
  })

  const followUpNote = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: 'Eigene Notiz: Akte Neumann — Unterlagen unvollständig, Rückfrage intern.',
      originKind: 'personal_note',
      title: 'Akte Neumann Rückfrage',
      capturedAt: hoursAgo(now, 1),
      externalId: 'manual:preview-follow-up-note',
    }),
    UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID,
  )
  followUpNote.content = composeInboxWorkingCopy({
    source: followUpNote.content,
    draft: '',
    notes: KFZ_FOLLOW_UP_NOTE,
  })

  const donePhone = requirePreviewItem(
    buildManualCapturePreviewInboxItem({
      sourceText: [
        'Erledigter Anruf Kunde Fertig',
        'Sachverhalt intern abgeschlossen.',
        'Telefon: +491708887766',
      ].join('\n'),
      originKind: 'phone_call',
      title: 'Anruf Fertig erledigt',
      origin: {
        displayName: 'Kunde Fertig',
        address: '+491708887766',
        addressKind: 'phone',
      },
      capturedAt: hoursAgo(now, 24 * 5),
      externalId: 'manual:preview-done-phone',
    }),
    UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID,
  )
  donePhone.processed_at = hoursAgo(now, 24 * 4)
  donePhone.content = composeInboxWorkingCopy({
    source: donePhone.content,
    draft: '',
    notes: KFZ_CONTACTED_NOTE,
  })

  return {
    unprocessedItems: [
      ...kfz.unprocessedItems,
      buildTodayLandingItem(now),
      phoneKfz,
      phone,
      pastedEmail,
      ownNote,
      buildOtherEmailItem(),
      olderPhone,
      contactedEmail,
      followUpNote,
    ],
    processedItems: [...kfz.processedItems, donePhone],
    taskRelationsByItemId: kfz.taskRelationsByItemId,
  }
}

export function listUnifiedInboxPreviewItems(
  built: ReturnType<typeof buildUnifiedInboxPreviewItems> = buildUnifiedInboxPreviewItems(),
): InboxItem[] {
  return [...built.unprocessedItems, ...built.processedItems]
}

export function splitUnifiedInboxPreviewItems(items: InboxItem[]): {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
} {
  return {
    unprocessedItems: items.filter((item) => item.processed_at === null),
    processedItems: items.filter((item) => item.processed_at !== null),
  }
}
