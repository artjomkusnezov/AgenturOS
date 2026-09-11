export const KFZ_ANALYTICS_EVENT_NAMES = [
  'landing_view',
  'traffic_source',
  'funnel_start',
  'initial_branch_selected',
  'step_view',
  'step_completed',
  'back_navigation',
  'validation_blocked',
  'submit_started',
  'submit_failed',
  'submit_succeeded',
  'funnel_abandoned',
] as const

export type KfzAnalyticsEventName = (typeof KFZ_ANALYTICS_EVENT_NAMES)[number]

export const KFZ_ANALYTICS_TRAFFIC_SOURCES = [
  'direct',
  'utm',
  'campaign',
] as const

export type KfzAnalyticsTrafficSource =
  (typeof KFZ_ANALYTICS_TRAFFIC_SOURCES)[number]

export const KFZ_ANALYTICS_REFERRER_CATEGORIES = [
  'direct',
  'search',
  'social',
  'internal',
  'other',
] as const

export type KfzAnalyticsReferrerCategory =
  (typeof KFZ_ANALYTICS_REFERRER_CATEGORIES)[number]

export const KFZ_ANALYTICS_ERROR_CATEGORIES = [
  'timeout',
  'rate_limited',
  'invalid_consent',
  'invalid_payload',
  'network',
  'server',
  'unknown',
] as const

export type KfzAnalyticsErrorCategory =
  (typeof KFZ_ANALYTICS_ERROR_CATEGORIES)[number]

export const KFZ_ANALYTICS_PROPERTY_KEYS = [
  'stepId',
  'fromStepId',
  'branchId',
  'trafficSource',
  'referrerCategory',
  'utmSource',
  'utmCampaign',
  'fieldId',
  'errorCategory',
  'activeMs',
  'lastStepId',
] as const

export type KfzAnalyticsPropertyKey = (typeof KFZ_ANALYTICS_PROPERTY_KEYS)[number]

export type KfzAnalyticsProperties = {
  stepId?: string
  fromStepId?: string
  branchId?: string
  trafficSource?: KfzAnalyticsTrafficSource
  referrerCategory?: KfzAnalyticsReferrerCategory
  utmSource?: string
  utmCampaign?: string
  fieldId?: string
  errorCategory?: KfzAnalyticsErrorCategory
  activeMs?: number
  lastStepId?: string
}

export type KfzAnalyticsConsentState = 'unknown' | 'granted' | 'declined'

export type KfzAnalyticsRecord = {
  eventName: KfzAnalyticsEventName
  eventKey: string
  sessionId: string
  occurredAt: string
  properties: KfzAnalyticsProperties
}

export type KfzAnalyticsPeriodId = '24h' | '7d' | '30d' | 'all' | 'custom'

export const KFZ_ANALYTICS_FILTER_ALL = 'all' as const
export const KFZ_ANALYTICS_UNKNOWN_ID = 'unknown' as const

export type KfzAnalyticsTrafficSourceFilter =
  | KfzAnalyticsTrafficSource
  | typeof KFZ_ANALYTICS_FILTER_ALL
  | typeof KFZ_ANALYTICS_UNKNOWN_ID

export type KfzAnalyticsBranchFilter =
  | typeof KFZ_ANALYTICS_FILTER_ALL
  | typeof KFZ_ANALYTICS_UNKNOWN_ID
  | string

export type KfzAnalyticsStepFilter = typeof KFZ_ANALYTICS_FILTER_ALL | string

export type KfzAnalyticsDropOffFilter =
  | typeof KFZ_ANALYTICS_FILTER_ALL
  | typeof KFZ_ANALYTICS_UNKNOWN_ID
  | string

export type KfzAnalyticsDashboardFilters = {
  periodId: KfzAnalyticsPeriodId
  fromDate: string | null
  toDate: string | null
  trafficSource: KfzAnalyticsTrafficSourceFilter
  branchId: KfzAnalyticsBranchFilter
  reachedStepId: KfzAnalyticsStepFilter
  dropOffStepId: KfzAnalyticsDropOffFilter
}

export type KfzAnalyticsDashboardQuery = {
  period?: string
  from?: string
  to?: string
  source?: string
  branch?: string
  step?: string
  drop?: string
}

export type KfzAnalyticsCountRow = {
  id: string
  label: string
  count: number
}

export type KfzAnalyticsTransitionRow = {
  id: string
  fromStepId: string
  toStepId: string
  label: string
  count: number
}

export type KfzAnalyticsReviewStatus =
  | 'ready'
  | 'empty'
  | 'unavailable'
  | 'configuration_missing'

export type KfzAnalyticsDataQuality = {
  available: boolean
  status: KfzAnalyticsReviewStatus
  acceptedEvents: number
  duplicateEvents: number
  invalidTransitions: number
  rejectedTimings: number
  missingSessionMetadata: number
  malformedSourceCategories: number
  incompleteSessions: number
}

export type KfzAnalyticsIngestQuality = {
  consentBlocked: number
  duplicates: number
  invalidTransitions: number
  rejectedTimings: number
  missingSessionMetadata: number
  malformedSourceCategories: number
  redactedForbiddenFields: number
}

export type KfzAnalyticsStepFunnelRow = {
  stepId: string
  label: string
  reached: number
  completed: number
  dropOff: number
  dropOffRate: number | null
  averageActiveMs: number | null
  medianActiveMs: number | null
}

export type KfzAnalyticsDashboard = {
  periodId: KfzAnalyticsPeriodId
  filters: KfzAnalyticsDashboardFilters
  from: string | null
  to: string
  empty: boolean
  filterActive: boolean
  matchedSessions: number
  visits: number
  funnelStarts: number
  submissions: number
  conversionRate: number | null
  startRate: number | null
  submitFromStartRate: number | null
  trafficSources: KfzAnalyticsCountRow[]
  referrerCategories: KfzAnalyticsCountRow[]
  campaigns: KfzAnalyticsCountRow[]
  branches: KfzAnalyticsCountRow[]
  steps: KfzAnalyticsStepFunnelRow[]
  transitions: KfzAnalyticsTransitionRow[]
  dropOffs: KfzAnalyticsCountRow[]
  validationBlocked: number
  submitFailed: number
  submitFailedByCategory: KfzAnalyticsCountRow[]
  landingAverageActiveMs: number | null
  landingMedianActiveMs: number | null
  siteAverageActiveMs: number | null
  siteMedianActiveMs: number | null
  abandoned: number
  matchedSessionIds: string[]
  dataQuality: KfzAnalyticsDataQuality
}

export type KfzAnalyticsDashboardLoadResult =
  | { ok: true; status: 'ready'; dashboard: KfzAnalyticsDashboard }
  | {
      ok: false
      status: 'unavailable' | 'configuration_missing'
      error: string
    }

export type KfzAnalyticsStore = {
  insertEvent: (
    record: KfzAnalyticsRecord,
  ) => Promise<{ inserted: boolean; record: KfzAnalyticsRecord }>
  listEvents: (input?: {
    from?: string | null
    to?: string | null
  }) => Promise<KfzAnalyticsRecord[]>
}
