import type { ManualCaptureOriginKind } from '@/features/inbound/manual/lib/manual-capture-origin'
import type { InboundSender } from '@/features/inbound/types/inbound-item'

/**
 * Provider-neutral working copy for a human-typed/pasted information item.
 * Adapter input only — no inbox mutations, no customer matching.
 */
export type NormalizedManualCapture = {
  externalId: string
  capturedAt: string
  sourceText: string
  originKind: ManualCaptureOriginKind
  title: string | null
  capturer: InboundSender
  origin: InboundSender | null
}
