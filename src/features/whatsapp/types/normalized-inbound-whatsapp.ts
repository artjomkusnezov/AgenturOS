/**
 * Providerneutraler Vertrag zwischen Meta-Transport und WhatsApp-Adapter.
 * Keine Meta-Webhook-Typen.
 */

export type NormalizedWhatsAppMessageType =
  | 'text'
  | 'audio'
  | 'image'
  | 'document'
  | 'unsupported'

export type NormalizedWhatsAppMedia = {
  mediaId: string
  mimeType: string
  filename: string
  caption?: string | null
  /** Bereits heruntergeladene Bytes (Transport lädt vor dem Adapter). */
  bytes: ArrayBuffer
  sizeBytes?: number
}

export type NormalizedInboundWhatsApp = {
  /** Meta wamid — stabile Dedup-ID. */
  externalMessageId: string
  senderPhone: string
  senderName?: string | null
  receivedAt: string
  type: NormalizedWhatsAppMessageType
  text?: string | null
  replyToExternalMessageId?: string | null
  media?: NormalizedWhatsAppMedia | null
  /** Ursprünglicher Meta-Typ bei unsupported. */
  rawType?: string | null
  metadata?: Record<string, unknown>
}
