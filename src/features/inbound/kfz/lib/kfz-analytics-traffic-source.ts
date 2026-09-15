import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  isKfzAnalyticsReferrerCategory,
  isKfzAnalyticsTrafficSource,
  sanitizeKfzAnalyticsUtmCampaign,
  sanitizeKfzAnalyticsUtmSource,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import type { KfzAnalyticsConsentStorage } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import {
  analyticsConsentAllowsPersist,
  clearPendingKfzAnalyticsFirstSource,
  readPendingKfzAnalyticsFirstSource,
  writePendingKfzAnalyticsFirstSource,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import { KFZ_ANALYTICS_FIRST_SOURCE_STORAGE_KEY } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import { classifyKfzAnalyticsReferrerCategory } from '@/features/inbound/kfz/lib/kfz-analytics-referrer'
import type {
  KfzAnalyticsCoarseSource,
  KfzAnalyticsConsentState,
  KfzAnalyticsProperties,
  KfzAnalyticsReferrerCategory,
  KfzAnalyticsTrafficSource,
} from '@/features/inbound/kfz/types/kfz-analytics'
import {
  KFZ_ANALYTICS_COARSE_SOURCES,
  KFZ_ANALYTICS_UNKNOWN_ID,
} from '@/features/inbound/kfz/types/kfz-analytics'

export type KfzAnalyticsTrafficSnapshot = {
  trafficSource: KfzAnalyticsTrafficSource
  utmSource: string | null
  utmCampaign: string | null
  referrerCategory: KfzAnalyticsReferrerCategory | null
}

const COARSE_SOURCE_SET = new Set<string>(KFZ_ANALYTICS_COARSE_SOURCES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Coarse traffic origin. Full URLs, referrers, query strings and free-form
 * UTM values are discarded — never stored. Referrer becomes a category only.
 */
export function sanitizeKfzAnalyticsTrafficSource(
  attribution: KfzLandingAttribution | null | undefined,
  referrer?: string | null,
): KfzAnalyticsTrafficSnapshot {
  const utmSource = sanitizeKfzAnalyticsUtmSource(
    attribution?.utmSource ?? null,
  )
  const utmCampaign = sanitizeKfzAnalyticsUtmCampaign(
    attribution?.utmCampaign ?? attribution?.campaign ?? null,
  )
  const referrerCategory =
    referrer === undefined
      ? null
      : classifyKfzAnalyticsReferrerCategory(referrer) ?? null

  if (utmSource || utmCampaign) {
    return {
      trafficSource: 'utm',
      utmSource,
      utmCampaign,
      referrerCategory,
    }
  }

  const campaignOnly = sanitizeKfzAnalyticsUtmCampaign(attribution?.campaign ?? null)
  if (campaignOnly) {
    return {
      trafficSource: 'campaign',
      utmSource: null,
      utmCampaign: campaignOnly,
      referrerCategory,
    }
  }

  return {
    trafficSource: 'direct',
    utmSource: null,
    utmCampaign: null,
    referrerCategory,
  }
}

export function isKfzAnalyticsCoarseSource(
  value: unknown,
): value is KfzAnalyticsCoarseSource {
  return typeof value === 'string' && COARSE_SOURCE_SET.has(value)
}

/**
 * Authorized review category from already-approved fields only.
 * Paid = allow-listed UTM/campaign. Organic = search referrer without paid
 * tokens. Referral = social/other referrer. Direct = typed/empty/internal.
 */
export function classifyKfzAnalyticsCoarseSource(
  snapshot: Pick<
    KfzAnalyticsTrafficSnapshot,
    'trafficSource' | 'utmSource' | 'utmCampaign' | 'referrerCategory'
  >,
): KfzAnalyticsCoarseSource {
  if (
    snapshot.trafficSource === 'utm' ||
    snapshot.trafficSource === 'campaign' ||
    Boolean(snapshot.utmSource) ||
    Boolean(snapshot.utmCampaign)
  ) {
    return 'paid'
  }
  if (snapshot.referrerCategory === 'search') {
    return 'organic'
  }
  if (
    snapshot.referrerCategory === 'social' ||
    snapshot.referrerCategory === 'other'
  ) {
    return 'referral'
  }
  return 'direct'
}

export function kfzAnalyticsCoarseSourceLabel(id: string): string {
  if (id === 'direct') {
    return 'Direkt'
  }
  if (id === 'referral') {
    return 'Verweis'
  }
  if (id === 'organic') {
    return 'Organisch'
  }
  if (id === 'paid') {
    return 'Bezahlt'
  }
  if (id === KFZ_ANALYTICS_UNKNOWN_ID) {
    return 'Unbekannt'
  }
  return id
}

export function sanitizeKfzAnalyticsFirstSourceSnapshot(
  raw: unknown,
): KfzAnalyticsTrafficSnapshot | null {
  if (!isRecord(raw)) {
    return null
  }
  const trafficSource = isKfzAnalyticsTrafficSource(raw.trafficSource)
    ? raw.trafficSource
    : null
  if (!trafficSource) {
    return null
  }
  const utmSource = sanitizeKfzAnalyticsUtmSource(
    typeof raw.utmSource === 'string' ? raw.utmSource : null,
  )
  const utmCampaign = sanitizeKfzAnalyticsUtmCampaign(
    typeof raw.utmCampaign === 'string' ? raw.utmCampaign : null,
  )
  const referrerCategory = isKfzAnalyticsReferrerCategory(raw.referrerCategory)
    ? raw.referrerCategory
    : null
  return {
    trafficSource,
    utmSource,
    utmCampaign,
    referrerCategory,
  }
}

export function readKfzAnalyticsFirstSource(
  storage: KfzAnalyticsConsentStorage | null | undefined,
  consent: KfzAnalyticsConsentState,
): KfzAnalyticsTrafficSnapshot | null {
  if (!analyticsConsentAllowsPersist(consent) || !storage) {
    return null
  }
  try {
    const raw = storage.getItem(KFZ_ANALYTICS_FIRST_SOURCE_STORAGE_KEY)
    if (!raw) {
      return null
    }
    return sanitizeKfzAnalyticsFirstSourceSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeKfzAnalyticsFirstSource(
  storage: KfzAnalyticsConsentStorage | null | undefined,
  consent: KfzAnalyticsConsentState,
  snapshot: KfzAnalyticsTrafficSnapshot,
): void {
  if (!analyticsConsentAllowsPersist(consent) || !storage) {
    return
  }
  const sanitized = sanitizeKfzAnalyticsFirstSourceSnapshot(snapshot)
  if (!sanitized) {
    return
  }
  storage.setItem(KFZ_ANALYTICS_FIRST_SOURCE_STORAGE_KEY, JSON.stringify(sanitized))
}

export function clearKfzAnalyticsFirstSource(
  storage: KfzAnalyticsConsentStorage | null | undefined,
): void {
  if (!storage) {
    return
  }
  clearPendingKfzAnalyticsFirstSource(storage)
  storage.removeItem(KFZ_ANALYTICS_FIRST_SOURCE_STORAGE_KEY)
}

/**
 * First approved snapshot wins. Later attribution, internal referrers or
 * retries never replace an already captured source.
 */
export function lockKfzAnalyticsFirstSourceSnapshot(
  existing: KfzAnalyticsTrafficSnapshot | null | undefined,
  incoming: KfzAnalyticsTrafficSnapshot,
): KfzAnalyticsTrafficSnapshot {
  if (!existing) {
    return incoming
  }
  return {
    trafficSource: existing.trafficSource,
    utmSource: existing.utmSource,
    utmCampaign: existing.utmCampaign,
    referrerCategory: existing.referrerCategory,
  }
}

export function lockKfzAnalyticsFirstTouchProperties(
  current: KfzAnalyticsProperties,
  incoming: KfzAnalyticsProperties,
): KfzAnalyticsProperties {
  return {
    ...incoming,
    ...(current.trafficSource ? { trafficSource: current.trafficSource } : {}),
    ...(current.referrerCategory
      ? { referrerCategory: current.referrerCategory }
      : {}),
    ...(current.utmSource ? { utmSource: current.utmSource } : {}),
    ...(current.utmCampaign ? { utmCampaign: current.utmCampaign } : {}),
  }
}

/**
 * Resolve the session's first approved source. Persist the first-source
 * snapshot only after consent. Without consent the candidate stays in memory
 * for this storage instance and is never queued or retried.
 */
export function resolveKfzAnalyticsFirstSource(input: {
  storage: KfzAnalyticsConsentStorage
  consent: KfzAnalyticsConsentState
  attribution?: KfzLandingAttribution | null
  referrer?: string | null
}): KfzAnalyticsTrafficSnapshot {
  const persisted = readKfzAnalyticsFirstSource(input.storage, input.consent)
  if (persisted) {
    writePendingKfzAnalyticsFirstSource(input.storage, persisted)
    return persisted
  }

  const pending = sanitizeKfzAnalyticsFirstSourceSnapshot(
    readPendingKfzAnalyticsFirstSource(input.storage),
  )
  if (pending) {
    if (analyticsConsentAllowsPersist(input.consent)) {
      writeKfzAnalyticsFirstSource(input.storage, input.consent, pending)
    }
    return pending
  }

  const computed = sanitizeKfzAnalyticsTrafficSource(
    input.attribution,
    input.referrer,
  )
  writePendingKfzAnalyticsFirstSource(input.storage, computed)
  if (analyticsConsentAllowsPersist(input.consent)) {
    writeKfzAnalyticsFirstSource(input.storage, input.consent, computed)
  }
  return computed
}

export function kfzAnalyticsSourceBranchComparisonId(
  coarseSource: string,
  branchId: string | null | undefined,
): string {
  return `${coarseSource}:${branchId ?? KFZ_ANALYTICS_UNKNOWN_ID}`
}
