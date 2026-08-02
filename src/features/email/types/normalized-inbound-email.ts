import type { InboundSender } from '@/features/inbound/types/inbound-item'

/**
 * Providerneutraler Vertrag zwischen Mail-Transport und E-Mail-Adapter.
 * Keine Resend-/Postmark-Typen.
 */
export type NormalizedInboundEmailAddress = {
  displayName?: string | null
  address: string
}

export type NormalizedInboundEmailAttachment = {
  filename: string
  mimeType: string
  bytes: ArrayBuffer
  sizeBytes?: number
  /** 'inline' = CID/eingebettet; V1 Adapter übernimmt nur echte Attachments. */
  disposition?: 'attachment' | 'inline' | null
  contentId?: string | null
}

export type NormalizedInboundEmail = {
  messageId: string
  sender: NormalizedInboundEmailAddress
  origin?: NormalizedInboundEmailAddress | null
  receivedAt: string
  subject?: string | null
  plainText?: string | null
  html?: string | null
  attachments?: NormalizedInboundEmailAttachment[]
  metadata?: Record<string, unknown>
}

export type NormalizedInboundEmailSender = InboundSender
