/**
 * First-touch operational attribution for the public /kfz funnel.
 * Survives later navigation without query params. Does not store names,
 * email, phone, answers or file names. Independent of analytics consent.
 */

import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'

export const KFZ_LANDING_FIRST_ATTRIBUTION_STORAGE_KEY =
  'agenturos.kfz-landing.first-attribution.v1' as const

export type KfzLandingFirstAttributionStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const ATTRIBUTION_KEYS = [
  'campaign',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function sanitizeKfzLandingAttribution(
  raw: KfzLandingAttribution | null | undefined,
): KfzLandingAttribution {
  return {
    campaign: readOptionalString(raw?.campaign),
    utmSource: readOptionalString(raw?.utmSource),
    utmMedium: readOptionalString(raw?.utmMedium),
    utmCampaign: readOptionalString(raw?.utmCampaign),
    utmTerm: readOptionalString(raw?.utmTerm),
    utmContent: readOptionalString(raw?.utmContent),
  }
}

export function kfzLandingAttributionHasValue(
  attribution: KfzLandingAttribution | null | undefined,
): boolean {
  const sanitized = sanitizeKfzLandingAttribution(attribution)
  return ATTRIBUTION_KEYS.some((key) => Boolean(sanitized[key]))
}

/**
 * First non-empty attribution wins. Later empty URLs or different UTM
 * tokens never replace an already captured first touch.
 */
export function lockKfzLandingFirstAttribution(
  existing: KfzLandingAttribution | null | undefined,
  incoming: KfzLandingAttribution | null | undefined,
): KfzLandingAttribution {
  const current = sanitizeKfzLandingAttribution(existing)
  if (kfzLandingAttributionHasValue(current)) {
    return current
  }
  return sanitizeKfzLandingAttribution(incoming)
}

export function parseKfzLandingFirstAttribution(
  raw: unknown,
): KfzLandingAttribution | null {
  const source =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as unknown
          } catch {
            return null
          }
        })()
      : raw
  if (!isRecord(source)) {
    return null
  }
  const parsed = sanitizeKfzLandingAttribution({
    campaign: readOptionalString(source.campaign),
    utmSource: readOptionalString(source.utmSource),
    utmMedium: readOptionalString(source.utmMedium),
    utmCampaign: readOptionalString(source.utmCampaign),
    utmTerm: readOptionalString(source.utmTerm),
    utmContent: readOptionalString(source.utmContent),
  })
  return kfzLandingAttributionHasValue(parsed) ? parsed : null
}

export function readKfzLandingFirstAttribution(
  storage: KfzLandingFirstAttributionStorage | null | undefined,
): KfzLandingAttribution | null {
  if (!storage) {
    return null
  }
  try {
    return parseKfzLandingFirstAttribution(
      storage.getItem(KFZ_LANDING_FIRST_ATTRIBUTION_STORAGE_KEY),
    )
  } catch {
    return null
  }
}

export function writeKfzLandingFirstAttribution(
  storage: KfzLandingFirstAttributionStorage | null | undefined,
  attribution: KfzLandingAttribution,
): KfzLandingAttribution | null {
  const sanitized = sanitizeKfzLandingAttribution(attribution)
  if (!storage || !kfzLandingAttributionHasValue(sanitized)) {
    return kfzLandingAttributionHasValue(sanitized) ? sanitized : null
  }
  try {
    storage.setItem(
      KFZ_LANDING_FIRST_ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(sanitized),
    )
  } catch {
    return sanitized
  }
  return sanitized
}

export function createMemoryKfzLandingFirstAttributionStorage(
  seed: Record<string, string> = {},
): KfzLandingFirstAttributionStorage & { data: Record<string, string> } {
  const data = { ...seed }
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = value
    },
    removeItem(key) {
      delete data[key]
    },
  }
}

export function getSessionKfzLandingFirstAttributionStorage():
  | KfzLandingFirstAttributionStorage
  | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  return sessionStorage
}

/**
 * Resolve first-touch attribution for submit. Persist only when the current
 * URL/query still carries tokens and nothing was locked yet.
 */
export function resolveKfzLandingFirstAttribution(
  storage: KfzLandingFirstAttributionStorage | null | undefined,
  incoming: KfzLandingAttribution | null | undefined,
): KfzLandingAttribution {
  const locked = lockKfzLandingFirstAttribution(
    readKfzLandingFirstAttribution(storage),
    incoming,
  )
  if (kfzLandingAttributionHasValue(locked)) {
    writeKfzLandingFirstAttribution(storage, locked)
  }
  return locked
}
