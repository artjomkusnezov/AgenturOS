import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  sanitizeKfzAnalyticsUtmCampaign,
  sanitizeKfzAnalyticsUtmSource,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import { classifyKfzAnalyticsReferrerCategory } from '@/features/inbound/kfz/lib/kfz-analytics-referrer'
import type {
  KfzAnalyticsReferrerCategory,
  KfzAnalyticsTrafficSource,
} from '@/features/inbound/kfz/types/kfz-analytics'

export type KfzAnalyticsTrafficSnapshot = {
  trafficSource: KfzAnalyticsTrafficSource
  utmSource: string | null
  utmCampaign: string | null
  referrerCategory: KfzAnalyticsReferrerCategory | null
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
