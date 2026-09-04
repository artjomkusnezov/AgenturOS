/**
 * Distinct Coexistence models for a later conversation layer.
 * Not Inbox items — metadata-only, no message bodies / media / PII payloads.
 *
 * Meta payload shapes can evolve; fields here are intentionally sparse and defensive.
 */

export type WhatsAppSmbMessageEchoEvent = {
  /** Business-App outbound / echo data (Cloud API coexistence). */
  kind: 'smb_message_echoes'
  wabaId: string | null
  phoneNumberId: string | null
  /** Number of echo entries observed — never content. */
  echoCount: number
}

export type WhatsAppHistoryEvent = {
  /** Historical backfill / sync chunk — must not flood Inbox. */
  kind: 'history'
  wabaId: string | null
  phoneNumberId: string | null
  /** Top-level history array length when present; otherwise 0. */
  historyChunkCount: number
}

export type WhatsAppSmbAppStateSyncEvent = {
  /** Contact / app state-sync metadata — no Inbox items. */
  kind: 'smb_app_state_sync'
  wabaId: string | null
  phoneNumberId: string | null
  stateSyncCount: number
}

export type WhatsAppAccountUpdateEvent = {
  kind: 'account_update'
  wabaId: string | null
  phoneNumberId: string | null
}

export type WhatsAppUnknownWebhookFieldEvent = {
  kind: 'unknown'
  rawField: string | null
  wabaId: string | null
  phoneNumberId: string | null
}

export type WhatsAppCoexistenceEvent =
  | WhatsAppSmbMessageEchoEvent
  | WhatsAppHistoryEvent
  | WhatsAppSmbAppStateSyncEvent
  | WhatsAppAccountUpdateEvent
  | WhatsAppUnknownWebhookFieldEvent
