import { parseOptionalIdAllowlist } from '@/features/whatsapp/lib/webhook-entry-filter'

export type InboundWhatsAppRuntimeConfig = {
  agencyId: string
  actorUserId: string
  verifyToken: string
  metaAppSecret: string
  accessToken: string
  /** Informativ / Ops — wird NICHT als Filter gegen eingehende Webhooks genutzt. */
  phoneNumberId: string | null
  /** Informativ / Ops — wird NICHT als Filter gegen eingehende Webhooks genutzt. */
  businessAccountId: string | null
  graphApiVersion: string
  /**
   * Nur Development/Test: Signaturprüfung bewusst überspringen.
   * Production ignoriert dieses Flag immer (auch wenn gesetzt).
   */
  skipSignatureVerify: boolean
  /**
   * Optional future allowlist (comma-separated env). Empty = no filter (current behavior).
   * Never hardcode real production WABA / phone ids.
   */
  webhookAllowedWabaIds: string[]
  /**
   * Optional future allowlist (comma-separated env). Empty = no filter (current behavior).
   */
  webhookAllowedPhoneNumberIds: string[]
}

export type WhatsAppConfigMissingField =
  | 'INBOUND_WHATSAPP_AGENCY_ID'
  | 'INBOUND_WHATSAPP_ACTOR_USER_ID'
  | 'WHATSAPP_VERIFY_TOKEN'
  | 'WHATSAPP_ACCESS_TOKEN'
  | 'META_APP_SECRET'
  | 'WHATSAPP_PHONE_NUMBER_ID'
  | 'WHATSAPP_BUSINESS_ACCOUNT_ID'

function resolveInboundAgencyId(): string {
  return (
    process.env.INBOUND_WHATSAPP_AGENCY_ID?.trim() ||
    process.env.INBOUND_EMAIL_AGENCY_ID?.trim() ||
    ''
  )
}

function resolveInboundActorUserId(): string {
  return (
    process.env.INBOUND_WHATSAPP_ACTOR_USER_ID?.trim() ||
    process.env.INBOUND_EMAIL_ACTOR_USER_ID?.trim() ||
    ''
  )
}

/**
 * Welche Env-Namen fehlen — ohne Werte. Für Fail-Fast-Meldungen.
 * WhatsApp darf den bereits produktiv gesetzten Inbound-E-Mail-Kontext wiederverwenden,
 * solange keine kanal-spezifische Agency-/Actor-Zuordnung gesetzt ist.
 */
export function listMissingInboundWhatsAppEnvFields(input?: {
  requirePhoneNumberId?: boolean
  requireBusinessAccountId?: boolean
}): WhatsAppConfigMissingField[] {
  const requirePhoneNumberId = input?.requirePhoneNumberId ?? true
  const requireBusinessAccountId = input?.requireBusinessAccountId ?? true
  const missing: WhatsAppConfigMissingField[] = []

  if (!resolveInboundAgencyId()) {
    missing.push('INBOUND_WHATSAPP_AGENCY_ID')
  }
  if (!resolveInboundActorUserId()) {
    missing.push('INBOUND_WHATSAPP_ACTOR_USER_ID')
  }
  if (!(process.env.WHATSAPP_VERIFY_TOKEN?.trim())) {
    missing.push('WHATSAPP_VERIFY_TOKEN')
  }
  if (!(process.env.WHATSAPP_ACCESS_TOKEN?.trim())) {
    missing.push('WHATSAPP_ACCESS_TOKEN')
  }

  const metaAppSecret = process.env.META_APP_SECRET?.trim() ?? ''
  const skipSignatureVerify =
    process.env.NODE_ENV !== 'production' &&
    process.env.WHATSAPP_SKIP_SIGNATURE_VERIFY === 'true'

  if (!metaAppSecret && (process.env.NODE_ENV === 'production' || !skipSignatureVerify)) {
    missing.push('META_APP_SECRET')
  }

  if (requirePhoneNumberId && !(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim())) {
    missing.push('WHATSAPP_PHONE_NUMBER_ID')
  }
  if (requireBusinessAccountId && !(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim())) {
    missing.push('WHATSAPP_BUSINESS_ACCOUNT_ID')
  }

  return missing
}

export function formatWhatsAppConfigError(missing: WhatsAppConfigMissingField[]): string {
  if (missing.length === 0) {
    return 'WhatsApp-Inbound ist nicht konfiguriert.'
  }
  return `WhatsApp-Inbound ist nicht konfiguriert (${missing.join(', ')} fehlt).`
}

/**
 * Serverseitige WhatsApp-Inbound-Konfiguration (Meta Cloud API / Testnummer).
 * Keine Hardcodes; fehlende Pflichtwerte → Route meldet 503.
 *
 * phone_number_id / WABA-ID aus Env sind Ops-Metadaten und dürfen eingehende
 * Testnummern-Webhooks nicht blockieren (kein Match-Filter).
 *
 * Optional: WHATSAPP_WEBHOOK_ALLOWED_WABA_IDS / WHATSAPP_WEBHOOK_ALLOWED_PHONE_NUMBER_IDS
 * — leer/unset = kein Filter (bisheriges Verhalten).
 */
export function getInboundWhatsAppRuntimeConfig(): InboundWhatsAppRuntimeConfig | null {
  const missing = listMissingInboundWhatsAppEnvFields({
    requirePhoneNumberId: true,
    requireBusinessAccountId: true,
  })
  if (missing.length > 0) {
    return null
  }

  const agencyId = resolveInboundAgencyId()
  const actorUserId = resolveInboundActorUserId()
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN!.trim()
  const metaAppSecret = process.env.META_APP_SECRET?.trim() ?? ''
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim()
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!.trim()
  const graphApiVersion =
    process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v21.0'

  // Production: Skip-Flag wird IMMER ignoriert.
  const skipSignatureVerify =
    process.env.NODE_ENV !== 'production' &&
    process.env.WHATSAPP_SKIP_SIGNATURE_VERIFY === 'true'

  return {
    agencyId,
    actorUserId,
    verifyToken,
    metaAppSecret,
    accessToken,
    phoneNumberId,
    businessAccountId,
    graphApiVersion,
    skipSignatureVerify,
    webhookAllowedWabaIds: parseOptionalIdAllowlist(
      process.env.WHATSAPP_WEBHOOK_ALLOWED_WABA_IDS,
    ),
    webhookAllowedPhoneNumberIds: parseOptionalIdAllowlist(
      process.env.WHATSAPP_WEBHOOK_ALLOWED_PHONE_NUMBER_IDS,
    ),
  }
}

/** Nur für GET-Challenge (Meta Webhook-Subscription). */
export function getWhatsAppVerifyToken(): string | null {
  const token = process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? ''
  return token.length > 0 ? token : null
}
