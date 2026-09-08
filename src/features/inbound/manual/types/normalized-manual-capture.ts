import type { InboundSender } from '@/features/inbound/types/inbound-item'

/**
 * Provider-neutral working copy for a human-typed/pasted information item.
 * Adapter input only — no inbox mutations, no customer matching.
 */
export type NormalizedManualCapture = {
  externalId: string
  capturedAt: string
  sourceText: string
  title: string | null
  capturer: InboundSender
  origin: InboundSender | null
}
