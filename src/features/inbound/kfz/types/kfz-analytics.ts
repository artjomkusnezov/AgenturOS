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

export type KfzAnalyticsPeriodId = '24h' | '7d' | '30d' | 'all'

export type KfzAnalyticsCountRow = {
  id: string
  label: string
  count: number
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
  from: string | null
  to: string
  empty: boolean
  visits: number
  funnelStarts: number
  submissions: number
  conversionRate: number | null
  trafficSources: KfzAnalyticsCountRow[]
  campaigns: KfzAnalyticsCountRow[]
  branches: KfzAnalyticsCountRow[]
  steps: KfzAnalyticsStepFunnelRow[]
  validationBlocked: number
  submitFailed: number
  submitFailedByCategory: KfzAnalyticsCountRow[]
  landingAverageActiveMs: number | null
  landingMedianActiveMs: number | null
  abandoned: number
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
