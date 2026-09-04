/**
 * Minimale Meta Cloud API Webhook-Typen (nur was AgenturOS braucht).
 * Bleiben im Transport/Mapping — nicht im Intake-Kern.
 *
 * Coexistence fields (`smb_message_echoes`, `history`, `smb_app_state_sync`, …)
 * are classified separately; nested shapes stay intentionally loose.
 */

export type MetaWhatsAppContact = {
  wa_id?: string
  profile?: { name?: string }
}

export type MetaWhatsAppMediaPayload = {
  id?: string
  mime_type?: string
  sha256?: string
  caption?: string
  filename?: string
  voice?: boolean
}

export type MetaWhatsAppMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  audio?: MetaWhatsAppMediaPayload
  image?: MetaWhatsAppMediaPayload
  document?: MetaWhatsAppMediaPayload
  context?: { id?: string; from?: string }
  [key: string]: unknown
}

export type MetaWhatsAppStatus = {
  id?: string
  status?: string
  timestamp?: string
  recipient_id?: string
}

export type MetaWhatsAppMetadata = {
  display_phone_number?: string
  phone_number_id?: string
}

/**
 * Value bag for `messages` and loosely for other webhook fields.
 * Coexistence-specific arrays (message_echoes, history, state_sync) are not
 * typed in depth — classification reads structural counts only.
 */
export type MetaWhatsAppValue = {
  messaging_product?: string
  metadata?: MetaWhatsAppMetadata
  contacts?: MetaWhatsAppContact[]
  messages?: MetaWhatsAppMessage[]
  statuses?: MetaWhatsAppStatus[]
  /** Coexistence: Business App outbound echoes (shape may vary). */
  message_echoes?: unknown[]
  /** Coexistence: history / backfill chunks (shape may vary). */
  history?: unknown[]
  /** Coexistence: app state sync entries (shape may vary). */
  state_sync?: unknown[]
}

export type MetaWhatsAppChange = {
  field?: string
  value?: MetaWhatsAppValue
}

export type MetaWhatsAppEntry = {
  id?: string
  changes?: MetaWhatsAppChange[]
}

export type MetaWhatsAppWebhookPayload = {
  object?: string
  entry?: MetaWhatsAppEntry[]
}
