import {
  kfzAnalyticsBranchLabel,
  kfzAnalyticsStepLabel,
  KFZ_ANALYTICS_STEP_IDS,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import {
  deriveKfzAnalyticsSessionFacts,
  kfzAnalyticsDashboardFiltersAreActive,
  kfzAnalyticsTrafficSourceLabel,
  KFZ_ANALYTICS_PERIODS,
  resolveKfzAnalyticsDashboardFilters,
  resolveKfzAnalyticsPeriod,
  sessionMatchesKfzAnalyticsFilters,
  type KfzAnalyticsSessionFacts,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import { KFZ_ANALYTICS_ABANDON_AFTER_MS } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import type {
  KfzAnalyticsCountRow,
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsDashboardQuery,
  KfzAnalyticsErrorCategory,
  KfzAnalyticsPeriodId,
  KfzAnalyticsRecord,
  KfzAnalyticsStepFunnelRow,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_UNKNOWN_ID } from '@/features/inbound/kfz/types/kfz-analytics'

export { KFZ_ANALYTICS_PERIODS, resolveKfzAnalyticsPeriod }

function inRange(iso: string, from: string | null, to: string): boolean {
  if (iso > to) {
    return false
  }
  if (from && iso < from) {
    return false
  }
  return true
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
  }
  return sorted[mid] ?? null
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null
  }
  return numerator / denominator
}

function countMapToRows(
  counts: Map<string, number>,
  labelFor: (id: string) => string,
): KfzAnalyticsCountRow[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, label: labelFor(id), count }))
}

function latestByKey(events: KfzAnalyticsRecord[]): Map<string, KfzAnalyticsRecord> {
  const latest = new Map<string, KfzAnalyticsRecord>()
  for (const event of events) {
    const current = latest.get(event.eventKey)
    if (!current || event.occurredAt >= current.occurredAt) {
      latest.set(event.eventKey, event)
    }
  }
  return latest
}

function groupEventsBySession(
  events: readonly KfzAnalyticsRecord[],
): Map<string, KfzAnalyticsRecord[]> {
  const bySession = new Map<string, KfzAnalyticsRecord[]>()
  for (const event of events) {
    const list = bySession.get(event.sessionId) ?? []
    list.push(event)
    bySession.set(event.sessionId, list)
  }
  return bySession
}

export function aggregateKfzAnalyticsDashboard(
  events: readonly KfzAnalyticsRecord[],
  input: {
    periodId?: KfzAnalyticsPeriodId
    nowMs: number
    abandonAfterMs?: number
    filters?: Partial<KfzAnalyticsDashboardFilters>
    query?: KfzAnalyticsDashboardQuery
  },
): KfzAnalyticsDashboard {
  const abandonAfterMs = input.abandonAfterMs ?? KFZ_ANALYTICS_ABANDON_AFTER_MS
  const query: KfzAnalyticsDashboardQuery = {
    period: input.query?.period ?? input.filters?.periodId ?? input.periodId,
    from: input.query?.from ?? input.filters?.fromDate ?? undefined,
    to: input.query?.to ?? input.filters?.toDate ?? undefined,
    source: input.query?.source ?? input.filters?.trafficSource,
    branch: input.query?.branch ?? input.filters?.branchId,
    step: input.query?.step ?? input.filters?.reachedStepId,
    drop: input.query?.drop ?? input.filters?.dropOffStepId,
  }
  const defaultPeriodId =
    input.periodId && input.periodId !== 'custom' ? input.periodId : '7d'
  const resolved = resolveKfzAnalyticsDashboardFilters(
    query,
    input.nowMs,
    defaultPeriodId,
  )
  const filters: KfzAnalyticsDashboardFilters = resolved.filters
  const from = resolved.from
  const to = resolved.to

  const ranged = events.filter((event) => inRange(event.occurredAt, from, to))
  const latest = [...latestByKey(ranged).values()]
  const bySession = groupEventsBySession(latest)
  const sessions: KfzAnalyticsSessionFacts[] = []
  for (const [sessionId, sessionEvents] of bySession) {
    sessions.push(
      deriveKfzAnalyticsSessionFacts(sessionId, sessionEvents, {
        nowMs: input.nowMs,
        abandonAfterMs,
      }),
    )
  }

  const matched = sessions.filter((facts) => sessionMatchesKfzAnalyticsFilters(facts, filters))

  let visits = 0
  let funnelStarts = 0
  let submissions = 0
  let abandoned = 0
  let validationBlocked = 0
  let submitFailed = 0
  const trafficSources = new Map<string, number>()
  const campaigns = new Map<string, number>()
  const branches = new Map<string, number>()
  const submitFailedByCategory = new Map<string, number>()
  const dropOffs = new Map<string, number>()
  const reached = new Map<string, Set<string>>()
  const completed = new Map<string, Set<string>>()
  const landingTimes: number[] = []
  const stepTimes = new Map<string, number[]>()

  for (const facts of matched) {
    if (facts.visit) {
      visits += 1
    }
    if (facts.funnelStart) {
      funnelStarts += 1
    }
    if (facts.submitted) {
      submissions += 1
    }
    if (facts.abandoned) {
      abandoned += 1
      const dropId = facts.dropOffStepId ?? KFZ_ANALYTICS_UNKNOWN_ID
      dropOffs.set(dropId, (dropOffs.get(dropId) ?? 0) + 1)
    }

    trafficSources.set(facts.trafficSource, (trafficSources.get(facts.trafficSource) ?? 0) + 1)
    if (facts.utmCampaign) {
      campaigns.set(facts.utmCampaign, (campaigns.get(facts.utmCampaign) ?? 0) + 1)
    }
    if (facts.branchId) {
      branches.set(facts.branchId, (branches.get(facts.branchId) ?? 0) + 1)
    }

    validationBlocked += facts.events.filter((event) => event.eventName === 'validation_blocked')
      .length

    for (const event of facts.events) {
      if (event.eventName === 'submit_failed') {
        submitFailed += 1
        const category = event.properties.errorCategory ?? KFZ_ANALYTICS_UNKNOWN_ID
        submitFailedByCategory.set(
          category,
          (submitFailedByCategory.get(category) ?? 0) + 1,
        )
      }
      if (event.eventName === 'step_view' && event.properties.stepId) {
        const set = reached.get(event.properties.stepId) ?? new Set()
        set.add(facts.sessionId)
        reached.set(event.properties.stepId, set)
        if (typeof event.properties.activeMs === 'number') {
          const times = stepTimes.get(event.properties.stepId) ?? []
          times.push(event.properties.activeMs)
          stepTimes.set(event.properties.stepId, times)
        }
      }
      if (event.eventName === 'step_completed' && event.properties.stepId) {
        const set = completed.get(event.properties.stepId) ?? new Set()
        set.add(facts.sessionId)
        completed.set(event.properties.stepId, set)
      }
      if (
        event.eventName === 'landing_view' &&
        typeof event.properties.activeMs === 'number'
      ) {
        landingTimes.push(event.properties.activeMs)
      }
    }
  }

  const stepIds = KFZ_ANALYTICS_STEP_IDS.filter(
    (stepId) =>
      (reached.get(stepId)?.size ?? 0) > 0 || (dropOffs.get(stepId) ?? 0) > 0,
  )

  const steps: KfzAnalyticsStepFunnelRow[] = stepIds.map((stepId) => {
    const reachedCount = reached.get(stepId)?.size ?? 0
    const completedCount = completed.get(stepId)?.size ?? 0
    const dropOffCount = dropOffs.get(stepId) ?? 0
    const times = stepTimes.get(stepId) ?? []
    return {
      stepId,
      label: kfzAnalyticsStepLabel(stepId),
      reached: reachedCount,
      completed: completedCount,
      dropOff: dropOffCount,
      dropOffRate: reachedCount > 0 ? dropOffCount / reachedCount : null,
      averageActiveMs: average(times),
      medianActiveMs: median(times),
    }
  })

  const empty = latest.length === 0 || matched.length === 0

  return {
    periodId: filters.periodId,
    filters,
    from,
    to,
    empty,
    filterActive: kfzAnalyticsDashboardFiltersAreActive(filters),
    matchedSessions: matched.length,
    visits,
    funnelStarts,
    submissions,
    conversionRate: ratio(submissions, visits),
    startRate: ratio(funnelStarts, visits),
    submitFromStartRate: ratio(submissions, funnelStarts),
    trafficSources: countMapToRows(trafficSources, kfzAnalyticsTrafficSourceLabel),
    campaigns: countMapToRows(campaigns, (id) => id),
    branches: countMapToRows(branches, (id) =>
      id === KFZ_ANALYTICS_UNKNOWN_ID ? 'Unbekannt' : kfzAnalyticsBranchLabel(id),
    ),
    steps,
    dropOffs: countMapToRows(dropOffs, (id) =>
      id === KFZ_ANALYTICS_UNKNOWN_ID ? 'Unbekannt' : kfzAnalyticsStepLabel(id),
    ),
    validationBlocked,
    submitFailed,
    submitFailedByCategory: countMapToRows(submitFailedByCategory, (id) => id),
    landingAverageActiveMs: average(landingTimes),
    landingMedianActiveMs: median(landingTimes),
    abandoned,
    matchedSessionIds: matched.map((facts) => facts.sessionId),
  }
}

export function classifyKfzAnalyticsSubmitError(
  code: string | null | undefined,
): KfzAnalyticsErrorCategory {
  if (code === 'timeout') {
    return 'timeout'
  }
  if (code === 'rate_limited') {
    return 'rate_limited'
  }
  if (code === 'invalid_consent') {
    return 'invalid_consent'
  }
  if (
    code === 'invalid_payload' ||
    code === 'invalid_field' ||
    code === 'missing_field' ||
    code === 'missing_contact'
  ) {
    return 'invalid_payload'
  }
  if (code === 'network') {
    return 'network'
  }
  if (
    code === 'intake_failed' ||
    code === 'store_unavailable' ||
    code === 'config_missing' ||
    code === 'forced_fail'
  ) {
    return 'server'
  }
  return 'unknown'
}
