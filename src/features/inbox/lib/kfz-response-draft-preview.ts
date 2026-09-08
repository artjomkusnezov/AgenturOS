/**
 * Local fixture for the Kfz response-draft workspace preview.
 * Not a production inbox item and not a customer send path.
 */

import { composeInboxWorkingCopy } from '@/features/inbox/lib/kfz-response-draft'
import { KFZ_REVIEW_STARTED_NOTE } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

export const KFZ_RESPONSE_DRAFT_PREVIEW_ITEM_ID =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

export const KFZ_RESPONSE_DRAFT_PREVIEW_TASK_ID =
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

export function buildKfzResponseDraftPreviewItem(): InboxItem {
  const source = [
    'Kfz-Anfrage von Anna Beispiel',
    'Ort: 49525 Lengerich',
    'Anliegen: Wechsel Kfz-Versicherung',
    'Bevorzugter Kanal: phone',
    'Telefon: +491701234567',
    'Fahrzeug: VW Golf 2019',
  ].join('\n')

  return {
    id: KFZ_RESPONSE_DRAFT_PREVIEW_ITEM_ID,
    agency_id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    channel: 'website',
    source: 'website',
    title: 'Kfz-Anfrage · Anna Beispiel',
    content: composeInboxWorkingCopy({
      source,
      draft: '',
      notes: KFZ_REVIEW_STARTED_NOTE,
    }),
    processed_at: null,
    created_at: '2026-09-08T08:00:00.000Z',
    updated_at: '2026-09-08T08:00:00.000Z',
    received_at: '2026-09-08T08:00:00.000Z',
    external_id: 'kfz:preview-response-draft',
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
      displayName: 'Anna Beispiel',
      address: '+491701234567',
      addressKind: 'phone',
    },
    inbound_metadata: {
      acquisition: { family: 'website', product: 'kfz', source: 'kfz.artkus.de' },
      inquiry: {
        reason: 'Wechsel Kfz-Versicherung',
        preferredChannel: 'phone',
        phone: '+491701234567',
        email: null,
        location: { postalCode: '49525', city: 'Lengerich' },
        vehicle: { make: 'VW', model: 'Golf', year: '2019' },
      },
    } as Json,
  }
}
