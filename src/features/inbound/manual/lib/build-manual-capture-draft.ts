import type { InboundSender } from '@/features/inbound/types/inbound-item'
import {
  MANUAL_CAPTURE_EMPTY_ERROR,
  MANUAL_CAPTURE_NO_AUTO_ACTION,
  MANUAL_CAPTURE_ORIGIN_KIND_ERROR,
  MANUAL_FIELD_SUGGESTION_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import {
  parseManualCaptureOriginKind,
  type ManualCaptureOriginKind,
} from '@/features/inbound/manual/lib/manual-capture-origin'
import { suggestManualCaptureFields } from '@/features/inbound/manual/lib/manual-field-suggestions'
import { sanitizeManualCaptureText } from '@/features/inbound/manual/lib/sanitize-manual-text'

export type ManualCaptureDraft = {
  sourceText: string
  originKind: ManualCaptureOriginKind
  proposed: {
    channel: 'manual'
    kind: 'text'
    originKind: ManualCaptureOriginKind
    title: string | null
    content: string
    origin: InboundSender | null
    sender: InboundSender
  }
  suggestions: Array<{
    field: string
    value: string
    label: typeof MANUAL_FIELD_SUGGESTION_LABEL
  }>
  requiresConfirmation: true
  noAutoAction: typeof MANUAL_CAPTURE_NO_AUTO_ACTION
}

export type BuildManualCaptureDraftResult =
  | { ok: true; draft: ManualCaptureDraft }
  | {
      ok: false
      error: typeof MANUAL_CAPTURE_EMPTY_ERROR | typeof MANUAL_CAPTURE_ORIGIN_KIND_ERROR
    }

const DEFAULT_CAPTURER: InboundSender = {
  displayName: 'Mitarbeiter',
  address: null,
  addressKind: 'other',
}

export type BuildManualCaptureDraftInput = {
  originKind: unknown
  capturer?: InboundSender
}

/**
 * Builds a reviewable inbound draft from pasted/typed text and a chosen origin.
 * Does not persist, contact customers, or create work.
 */
export function buildManualCaptureDraft(
  rawText: string,
  input: BuildManualCaptureDraftInput,
): BuildManualCaptureDraftResult {
  const originKind = parseManualCaptureOriginKind(input.originKind)
  if (!originKind) {
    return { ok: false, error: MANUAL_CAPTURE_ORIGIN_KIND_ERROR }
  }

  const sourceText = sanitizeManualCaptureText(rawText)

  if (!sourceText) {
    return { ok: false, error: MANUAL_CAPTURE_EMPTY_ERROR }
  }

  const capturer = input.capturer ?? DEFAULT_CAPTURER
  const suggestions = suggestManualCaptureFields(sourceText, rawText)

  return {
    ok: true,
    draft: {
      sourceText,
      originKind,
      proposed: {
        channel: 'manual',
        kind: 'text',
        originKind,
        title: suggestions.title,
        content: sourceText,
        origin: suggestions.origin,
        sender: {
          displayName: capturer.displayName?.trim() || DEFAULT_CAPTURER.displayName,
          address: capturer.address?.trim() || null,
          addressKind: capturer.addressKind ?? 'other',
        },
      },
      suggestions: suggestions.items,
      requiresConfirmation: true,
      noAutoAction: MANUAL_CAPTURE_NO_AUTO_ACTION,
    },
  }
}
