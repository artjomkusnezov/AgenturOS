import {
  buildInboundInboxContent,
  mapInboundChannelToInboxSource,
  normalizeInboundSender,
} from '@/features/inbound/lib/inbound-item-utils'
import { toInboundItemFromManualText } from '@/features/inbound/manual/lib/manual-adapter'
import {
  buildConfirmedManualCapture,
  type ConfirmManualCaptureInput,
} from '@/features/inbound/manual/services/confirm-manual-capture'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

export const MANUAL_CAPTURE_PREVIEW_PATH = '/dev/manual-capture' as const

export const MANUAL_CAPTURE_PREVIEW_AGENCY_ID =
  '11111111-1111-4111-8111-111111111111'
export const MANUAL_CAPTURE_PREVIEW_ACTOR_ID =
  '22222222-2222-4222-8222-222222222222'

/**
 * Local-only inbox working copy from a confirmed manual draft.
 * Not persisted and not a customer send path.
 */
export function buildManualCapturePreviewInboxItem(
  input: ConfirmManualCaptureInput,
): InboxItem | { error: string } {
  const built = buildConfirmedManualCapture(input)
  if (!built.ok) {
    return { error: built.error }
  }

  const inbound = toInboundItemFromManualText(built.capture)
  const now = inbound.receivedAt

  return {
    id: crypto.randomUUID(),
    agency_id: MANUAL_CAPTURE_PREVIEW_AGENCY_ID,
    user_id: MANUAL_CAPTURE_PREVIEW_ACTOR_ID,
    content: buildInboundInboxContent(inbound),
    title: inbound.title?.trim() || null,
    source: mapInboundChannelToInboxSource(inbound.channel),
    channel: inbound.channel,
    external_id: inbound.externalId,
    sender: normalizeInboundSender(inbound.sender) as Json,
    origin: inbound.origin ? (normalizeInboundSender(inbound.origin) as Json) : null,
    received_at: now,
    message_kind: inbound.kind ?? 'text',
    inbound_metadata: (inbound.metadata ?? {}) as Json,
    processed_at: null,
    created_at: now,
    updated_at: now,
    detected_language: null,
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
  }
}
