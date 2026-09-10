/**
 * AgenturOS Inbound Foundation (Punkt 36C.1 / 37C)
 *
 * Produktprinzip:
 * AgenturOS verarbeitet keine Messenger, E-Mails oder Formulare.
 * AgenturOS verarbeitet ausschließlich eingehende Informationen.
 *
 * Quelle = alles, was Informationen in AgenturOS erzeugen kann.
 *
 * Architektur:
 * Quelle → Adapter → InboundItem → Intake → Inbox
 */

/** Quellfamilie am InboundItem (erweiterbar). Keine Quellen-Sonderlogik. */
export const INBOUND_CHANNELS = ['manual', 'whatsapp', 'email', 'website'] as const

export type InboundChannel = (typeof INBOUND_CHANNELS)[number]

/** Optionale Inhaltsart — nicht messenger-spezifisch. */
export const INBOUND_ITEM_KINDS = [
  'text',
  'audio',
  'image',
  'document',
  'video',
  'location',
  'contact',
  'link',
  'unknown',
] as const

export type InboundItemKind = (typeof INBOUND_ITEM_KINDS)[number]

export type InboundAddressKind = 'phone' | 'email' | 'other'

export type InboundSender = {
  displayName?: string | null
  address?: string | null
  addressKind?: InboundAddressKind | null
}

export type InboundAttachmentInput = {
  filename: string
  mimeType: string
  bytes: ArrayBuffer
  sizeBytes?: number
}

/**
 * Kanalneutraler Kernvertrag für jede eingehende Information.
 * Adapter erzeugen genau dieses Shape — ohne Quellen-Sonderfelder.
 */
export type InboundItem = {
  channel: InboundChannel
  externalId: string
  sender: InboundSender
  /** Optionaler ursprünglicher Urheber (nicht der Übermittler). */
  origin?: InboundSender | null
  receivedAt: string
  /** Optionaler Titel (z. B. Betreff) — generisch. */
  title?: string | null
  content?: string | null
  kind?: InboundItemKind | null
  attachments?: InboundAttachmentInput[]
  metadata?: Record<string, unknown>
}

export type InboundSenderRecord = {
  displayName: string | null
  address: string | null
  addressKind: InboundAddressKind | null
}
