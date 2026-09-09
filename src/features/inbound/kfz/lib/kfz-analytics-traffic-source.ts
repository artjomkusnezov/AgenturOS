import type { KfzLandingAttribution } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  sanitizeKfzAnalyticsUtmCampaign,
  sanitizeKfzAnalyticsUtmSource,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import type { KfzAnalyticsTrafficSource } from '@/features/inbound/kfz/types/kfz-analytics'

export type KfzAnalyticsTrafficSnapshot = {
  trafficSource: KfzAnalyticsTrafficSource
  utmSource: string | null
  utmCampaign: string | null
}

/**
 * Coarse traffic origin. Full URLs, referrers, query strings and free-form
 * UTM values are discarded — never stored.
 */
export function sanitizeKfzAnalyticsTrafficSource(
  attribution: KfzLandingAttribution | null | undefined,
): KfzAnalyticsTrafficSnapshot {
  const utmSource = sanitizeKfzAnalyticsUtmSource(
    attribution?.utmSource ?? null,
  )
  const utmCampaign = sanitizeKfzAnalyticsUtmCampaign(
    attribution?.utmCampaign ?? attribution?.campaign ?? null,
  )

  if (utmSource || utmCampaign) {
    return {
      trafficSource: 'utm',
      utmSource,
      utmCampaign,
    }
  }

  const campaignOnly = sanitizeKfzAnalyticsUtmCampaign(attribution?.campaign ?? null)
  if (campaignOnly) {
    return {
      trafficSource: 'campaign',
      utmSource: null,
      utmCampaign: campaignOnly,
    }
  }

  return {
    trafficSource: 'direct',
    utmSource: null,
    utmCampaign: null,
  }
}
