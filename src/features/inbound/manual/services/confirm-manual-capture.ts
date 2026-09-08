import {
  buildInboundInboxContent,
  normalizeInboundSender,
} from '@/features/inbound/lib/inbound-item-utils'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'
import type { InboundSender } from '@/features/inbound/types/inbound-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { MANUAL_CAPTURE_EMPTY_ERROR, MANUAL_CAPTURE_ORIGIN_KIND_ERROR } from '@/features/inbound/manual/lib/manual-capture-copy'
import { parseManualCaptureOriginKind } from '@/features/inbound/manual/lib/manual-capture-origin'
import { toInboundItemFromManualText } from '@/features/inbound/manual/lib/manual-adapter'
import { sanitizeManualCaptureText, sanitizeManualCaptureTitle } from '@/features/inbound/manual/lib/sanitize-manual-text'
import type { NormalizedManualCapture } from '@/features/inbound/manual/types/normalized-manual-capture'

export type ConfirmManualCaptureInput = {
  sourceText: string
  originKind: unknown
  title?: string | null
  origin?: InboundSender | null
  capturer?: InboundSender
  capturedAt?: string
  externalId?: string
}

export type ConfirmManualCaptureResult =
  | {
      success: true
      item: InboxItem
      deduplicated: boolean
    }
  | {
      success: false
      error: string
    }

const DEFAULT_CAPTURER: InboundSender = {
  displayName: 'Mitarbeiter',
  address: null,
  addressKind: 'other',
}

function normalizeOrigin(origin: InboundSender | null | undefined): InboundSender | null {
  if (!origin) {
    return null
  }

  const normalized = normalizeInboundSender(origin)
  if (!normalized.displayName && !normalized.address) {
    return null
  }

  return normalized
}

/**
 * Builds the confirmed working copy the adapter will translate.
 * Human-edited fields win; empty text is rejected. No side effects.
 */
export function buildConfirmedManualCapture(
  input: ConfirmManualCaptureInput,
): { ok: true; capture: NormalizedManualCapture } | { ok: false; error: string } {
  const originKind = parseManualCaptureOriginKind(input.originKind)
  if (!originKind) {
    return { ok: false, error: MANUAL_CAPTURE_ORIGIN_KIND_ERROR }
  }

  const sourceText = sanitizeManualCaptureText(input.sourceText)

  if (!sourceText) {
    return { ok: false, error: MANUAL_CAPTURE_EMPTY_ERROR }
  }

  const titleInput = input.title?.trim() ?? ''
  const title = titleInput
    ? sanitizeManualCaptureTitle(titleInput) ?? titleInput.slice(0, 120)
    : null

  return {
    ok: true,
    capture: {
      externalId: input.externalId?.trim() || `manual:${crypto.randomUUID()}`,
      capturedAt: input.capturedAt?.trim() || new Date().toISOString(),
      sourceText,
      originKind,
      title,
      capturer: {
        displayName:
          input.capturer?.displayName?.trim() || DEFAULT_CAPTURER.displayName,
        address: input.capturer?.address?.trim() || null,
        addressKind: input.capturer?.addressKind ?? 'other',
      },
      origin: normalizeOrigin(input.origin),
    },
  }
}

/**
 * Explicit human confirmation: Adapter → Intake → Inbox.
 * No tasks, cases, status changes, customer contact, or AI decisions.
 */
export async function confirmManualCapture(input: {
  store: InboundIntakeStore
  agencyId: string
  actorUserId: string
  capture: ConfirmManualCaptureInput
}): Promise<ConfirmManualCaptureResult> {
  const built = buildConfirmedManualCapture(input.capture)

  if (!built.ok) {
    return { success: false, error: built.error }
  }

  const inboundItem = toInboundItemFromManualText(built.capture)
  const content = buildInboundInboxContent(inboundItem)
  if (!content.trim()) {
    return { success: false, error: MANUAL_CAPTURE_EMPTY_ERROR }
  }

  const result = await ingestInboundItem(input.store, {
    agencyId: input.agencyId,
    actorUserId: input.actorUserId,
    item: inboundItem,
  })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    item: result.item,
    deduplicated: result.deduplicated,
  }
}
