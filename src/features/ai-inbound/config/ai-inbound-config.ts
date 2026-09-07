/**
 * Runtime config for Inbox AI proposals (Gate 4).
 * Local deterministic provider only — no paid external model host in this slice.
 */

export type AiInboundRuntimeConfig = {
  /** When false, Inbox shows unavailable/not-generated instead of a proposal. */
  enabled: boolean
  /** Provider id used when enabled. */
  providerId: 'local-kfz-heuristic'
}

/**
 * Reads AI inbound proposal config.
 * Default: enabled (local heuristic, no API keys / no paid provider).
 * Set INBOUND_AI_ANALYSIS_ENABLED=false to force the safe unavailable state.
 */
export function getAiInboundRuntimeConfig(): AiInboundRuntimeConfig {
  const raw = process.env.INBOUND_AI_ANALYSIS_ENABLED?.trim().toLowerCase()
  const enabled = raw !== 'false' && raw !== '0' && raw !== 'off'

  return {
    enabled,
    providerId: 'local-kfz-heuristic',
  }
}
