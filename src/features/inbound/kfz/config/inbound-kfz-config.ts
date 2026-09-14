export type InboundKfzRuntimeConfig = {
  agencyId: string
  actorUserId: string
  /** Shared secret für Landingpage → Intake (Bearer). */
  intakeSecret: string
  /** Requests / Fenster (in-memory seam; Production: externes Limit Follow-up). */
  rateLimitMax: number
  rateLimitWindowMs: number
}

export type KfzConfigMissingField =
  | 'INBOUND_KFZ_AGENCY_ID'
  | 'INBOUND_KFZ_ACTOR_USER_ID'
  | 'INBOUND_KFZ_INTAKE_SECRET'

function resolveAgencyId(): string {
  return (
    process.env.INBOUND_KFZ_AGENCY_ID?.trim() ||
    process.env.INBOUND_EMAIL_AGENCY_ID?.trim() ||
    ''
  )
}

function resolveActorUserId(): string {
  return (
    process.env.INBOUND_KFZ_ACTOR_USER_ID?.trim() ||
    process.env.INBOUND_EMAIL_ACTOR_USER_ID?.trim() ||
    ''
  )
}

export function listMissingInboundKfzEnvFields(): KfzConfigMissingField[] {
  const missing: KfzConfigMissingField[] = []
  if (!resolveAgencyId()) {
    missing.push('INBOUND_KFZ_AGENCY_ID')
  }
  if (!resolveActorUserId()) {
    missing.push('INBOUND_KFZ_ACTOR_USER_ID')
  }
  if (!(process.env.INBOUND_KFZ_INTAKE_SECRET?.trim())) {
    missing.push('INBOUND_KFZ_INTAKE_SECRET')
  }
  return missing
}

export const KFZ_PUBLIC_SUBMIT_UNAVAILABLE_ERROR =
  'Die Anfrage konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.' as const

export function formatKfzConfigError(): string {
  return KFZ_PUBLIC_SUBMIT_UNAVAILABLE_ERROR
}

/**
 * Serverseitige Kfz-Website-Intake-Konfiguration.
 * Keine Hardcodes; fehlende Pflichtwerte → Route meldet 503.
 */
export function getInboundKfzRuntimeConfig(): InboundKfzRuntimeConfig | null {
  const missing = listMissingInboundKfzEnvFields()
  if (missing.length > 0) {
    return null
  }

  const rateLimitMaxRaw = process.env.INBOUND_KFZ_RATE_LIMIT_MAX?.trim()
  const rateLimitWindowRaw = process.env.INBOUND_KFZ_RATE_LIMIT_WINDOW_MS?.trim()
  const rateLimitMax = rateLimitMaxRaw ? Number(rateLimitMaxRaw) : 30
  const rateLimitWindowMs = rateLimitWindowRaw ? Number(rateLimitWindowRaw) : 60_000

  return {
    agencyId: resolveAgencyId(),
    actorUserId: resolveActorUserId(),
    intakeSecret: process.env.INBOUND_KFZ_INTAKE_SECRET!.trim(),
    rateLimitMax:
      Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 30,
    rateLimitWindowMs:
      Number.isFinite(rateLimitWindowMs) && rateLimitWindowMs > 0
        ? rateLimitWindowMs
        : 60_000,
  }
}
