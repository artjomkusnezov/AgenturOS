/**
 * Minimale Meta Cloud API Webhook-Typen (nur was 39A braucht).
 * Bleiben im Transport/Mapping — nicht im Intake-Kern.
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

export type MetaWhatsAppValue = {
  messaging_product?: string
  metadata?: MetaWhatsAppMetadata
  contacts?: MetaWhatsAppContact[]
  messages?: MetaWhatsAppMessage[]
  statuses?: MetaWhatsAppStatus[]
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
