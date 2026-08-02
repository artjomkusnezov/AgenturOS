export type InboundEmailRuntimeConfig = {
  agencyId: string
  actorUserId: string
  resendApiKey: string
  resendWebhookSecret: string
}

/**
 * Serverseitige Konfiguration für den E-Mail-Inbound.
 * Keine Hardcodes; produktive Secrets optional (Route meldet dann 503).
 */
export function getInboundEmailRuntimeConfig(): InboundEmailRuntimeConfig | null {
  const agencyId = process.env.INBOUND_EMAIL_AGENCY_ID?.trim() ?? ''
  const actorUserId = process.env.INBOUND_EMAIL_ACTOR_USER_ID?.trim() ?? ''
  const resendApiKey = process.env.RESEND_API_KEY?.trim() ?? ''
  const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim() ?? ''

  if (!agencyId || !actorUserId || !resendApiKey || !resendWebhookSecret) {
    return null
  }

  return {
    agencyId,
    actorUserId,
    resendApiKey,
    resendWebhookSecret,
  }
}
