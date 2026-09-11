import {
  kfzAnalyticsBranchLabel,
  kfzAnalyticsStepLabel,
  KFZ_ANALYTICS_STEP_IDS,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import {
  buildKfzAnalyticsPeriodComparison,
  collectKfzAnalyticsSessionFacts,
  compareKfzAnalyticsSessionsBy,
  kfzAnalyticsAggregateRate,
  kfzAnalyticsEventInRange,
  kfzAnalyticsRatesHidden,
  resolveKfzAnalyticsPreviousRange,
} from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import { kfzAnalyticsReferrerCategoryLabel } from '@/features/inbound/kfz/lib/kfz-analytics-referrer'
import {
  kfzAnalyticsDashboardFiltersAreActive,
  kfzAnalyticsTrafficSourceLabel,
  KFZ_ANALYTICS_PERIODS,
  resolveKfzAnalyticsDashboardFilters,
  resolveKfzAnalyticsPeriod,
  sessionMatchesKfzAnalyticsFilters,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import { KFZ_ANALYTICS_ABANDON_AFTER_MS } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import {
  classifyKfzAnalyticsActiveMs,
  isKfzAnalyticsTransitionAllowed,
  recordHasInvalidTransition,
  summarizeKfzAnalyticsDataQuality,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import type {
  KfzAnalyticsCountRow,
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsDashboardQuery,
  KfzAnalyticsErrorCategory,
  KfzAnalyticsHealthSnapshot,
  KfzAnalyticsPeriodId,
  KfzAnalyticsRecord,
  KfzAnalyticsStepFunnelRow,
  KfzAnalyticsTransitionRow,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_UNKNOWN_ID } from '@/features/inbound/kfz/types/kfz-analytics'

export { KFZ_ANALYTICS_PERIODS, resolveKfzAnalyticsPeriod }

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

function countMapToRows(
  counts: Map<string, number>,
  labelFor: (id: string) => string,
): KfzAnalyticsCountRow[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, label: labelFor(id), count }))
}

export function aggregateKfzAnalyticsDashboard(
  events: readonly KfzAnalyticsRecord[],
  input: {
    periodId?: KfzAnalyticsPeriodId
    nowMs: number
    abandonAfterMs?: number
    filters?: Partial<KfzAnalyticsDashboardFilters>
    query?: KfzAnalyticsDashboardQuery
    ingestHealth?: KfzAnalyticsHealthSnapshot | null
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
  const previousRange = resolveKfzAnalyticsPreviousRange(filters, { from, to })

  const sessions = collectKfzAnalyticsSessionFacts(events, {
    nowMs: input.nowMs,
    abandonAfterMs,
    from,
    to,
  })
  const matched = sessions.filter((facts) => sessionMatchesKfzAnalyticsFilters(facts, filters))
  const previousSessions = previousRange
    ? collectKfzAnalyticsSessionFacts(events, {
        nowMs: input.nowMs,
        abandonAfterMs,
        from: previousRange.from,
        to: previousRange.to,
      }).filter((facts) => sessionMatchesKfzAnalyticsFilters(facts, filters))
    : null
  const ranged = events.filter((event) => kfzAnalyticsEventInRange(event.occurredAt, from, to))
  const uniqueEventCount = new Set(ranged.map((event) => event.eventKey)).size

  let visits = 0
  let funnelStarts = 0
  let submissions = 0
  let abandoned = 0
  let validationBlocked = 0
  let submitFailed = 0
  const trafficSources = new Map<string, number>()
  const referrerCategories = new Map<string, number>()
  const campaigns = new Map<string, number>()
  const branches = new Map<string, number>()
  const submitFailedByCategory = new Map<string, number>()
  const dropOffs = new Map<string, number>()
  const transitionSessions = new Map<string, Set<string>>()
  const reached = new Map<string, Set<string>>()
  const completed = new Map<string, Set<string>>()
  const landingTimes: number[] = []
  const siteTimes: number[] = []
  const stepTimes = new Map<string, number[]>()

  function addTransition(
    sessionId: string,
    fromStepId: string,
    toStepId: string,
    kind: 'forward' | 'back',
  ) {
    if (!fromStepId || !toStepId || fromStepId === toStepId) {
      return
    }
    if (!isKfzAnalyticsTransitionAllowed(fromStepId, toStepId, kind)) {
      return
    }
    const id = `${fromStepId}->${toStepId}`
    const sessions = transitionSessions.get(id) ?? new Set<string>()
    sessions.add(sessionId)
    transitionSessions.set(id, sessions)
  }

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
    referrerCategories.set(
      facts.referrerCategory,
      (referrerCategories.get(facts.referrerCategory) ?? 0) + 1,
    )
    if (facts.siteActiveMs != null) {
      const siteTiming = classifyKfzAnalyticsActiveMs(facts.siteActiveMs)
      if (siteTiming.activeMs != null) {
        siteTimes.push(siteTiming.activeMs)
      }
    }
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
        if (event.properties.fromStepId && !recordHasInvalidTransition(event)) {
          addTransition(
            facts.sessionId,
            event.properties.fromStepId,
            event.properties.stepId,
            'forward',
          )
        }
        if (typeof event.properties.activeMs === 'number') {
          const timing = classifyKfzAnalyticsActiveMs(event.properties.activeMs)
          if (timing.activeMs != null) {
            const times = stepTimes.get(event.properties.stepId) ?? []
            times.push(timing.activeMs)
            stepTimes.set(event.properties.stepId, times)
          }
        }
      }
      if (
        event.eventName === 'back_navigation' &&
        event.properties.fromStepId &&
        event.properties.stepId &&
        !recordHasInvalidTransition(event)
      ) {
        addTransition(
          facts.sessionId,
          event.properties.fromStepId,
          event.properties.stepId,
          'back',
        )
      }
      if (event.eventName === 'step_completed' && event.properties.stepId) {
        const set = completed.get(event.properties.stepId) ?? new Set()
        set.add(facts.sessionId)
        completed.set(event.properties.stepId, set)
      }
      if (event.eventName === 'landing_view') {
        const timing = classifyKfzAnalyticsActiveMs(event.properties.activeMs)
        if (timing.activeMs != null) {
          landingTimes.push(timing.activeMs)
        }
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
      dropOffRate: kfzAnalyticsAggregateRate(dropOffCount, reachedCount, reachedCount),
      averageActiveMs: average(times),
      medianActiveMs: median(times),
    }
  })

  const transitions: KfzAnalyticsTransitionRow[] = [...transitionSessions.entries()]
    .map(([id, sessions]) => {
      const [fromStepId, toStepId] = id.split('->')
      const from = fromStepId ?? 'unknown'
      const to = toStepId ?? 'unknown'
      return {
        id,
        fromStepId: from,
        toStepId: to,
        label: `${kfzAnalyticsStepLabel(from)} → ${kfzAnalyticsStepLabel(to)}`,
        count: sessions.size,
      }
    })
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))

  const empty = uniqueEventCount === 0 || matched.length === 0
  const ratesHidden = kfzAnalyticsRatesHidden(matched.length)

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
    conversionRate: kfzAnalyticsAggregateRate(submissions, visits, matched.length),
    startRate: kfzAnalyticsAggregateRate(funnelStarts, visits, matched.length),
    submitFromStartRate: kfzAnalyticsAggregateRate(submissions, funnelStarts, matched.length),
    ratesHidden,
    trafficSources: countMapToRows(trafficSources, kfzAnalyticsTrafficSourceLabel),
    referrerCategories: countMapToRows(referrerCategories, (id) =>
      id === KFZ_ANALYTICS_UNKNOWN_ID ? 'Unbekannt' : kfzAnalyticsReferrerCategoryLabel(id),
    ),
    campaigns: countMapToRows(campaigns, (id) => id),
    branches: countMapToRows(branches, (id) =>
      id === KFZ_ANALYTICS_UNKNOWN_ID ? 'Unbekannt' : kfzAnalyticsBranchLabel(id),
    ),
    sourceComparisons: compareKfzAnalyticsSessionsBy(matched, 'source'),
    referrerComparisons: compareKfzAnalyticsSessionsBy(matched, 'referrer'),
    branchComparisons: compareKfzAnalyticsSessionsBy(matched, 'branch'),
    periodComparison: buildKfzAnalyticsPeriodComparison(
      matched,
      previousSessions,
      previousRange,
    ),
    steps,
    transitions,
    dropOffs: countMapToRows(dropOffs, (id) =>
      id === KFZ_ANALYTICS_UNKNOWN_ID ? 'Unbekannt' : kfzAnalyticsStepLabel(id),
    ),
    validationBlocked,
    submitFailed,
    submitFailedByCategory: countMapToRows(submitFailedByCategory, (id) => id),
    landingAverageActiveMs: average(landingTimes),
    landingMedianActiveMs: median(landingTimes),
    siteAverageActiveMs: average(siteTimes),
    siteMedianActiveMs: median(siteTimes),
    abandoned,
    matchedSessionIds: matched.map((facts) => facts.sessionId),
    dataQuality: summarizeKfzAnalyticsDataQuality({
      events: ranged,
      uniqueEventCount,
      sessions,
      empty: uniqueEventCount === 0,
      ingestHealth: input.ingestHealth,
    }),
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
