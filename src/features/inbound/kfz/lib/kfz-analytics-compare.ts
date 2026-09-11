import {
  kfzAnalyticsBranchLabel,
  kfzAnalyticsStepLabel,
  KFZ_ANALYTICS_STEP_IDS,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import {
  addUtcCalendarDays,
  deriveKfzAnalyticsSessionFacts,
  kfzAnalyticsDateToEndIso,
  kfzAnalyticsDateToStartIso,
  kfzAnalyticsInclusiveDayCount,
  kfzAnalyticsTrafficSourceLabel,
  KFZ_ANALYTICS_PERIODS,
  KFZ_ANALYTICS_UNKNOWN_LABEL,
  type KfzAnalyticsSessionFacts,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  classifyKfzAnalyticsActiveMs,
  isKfzAnalyticsTransitionAllowed,
  recordHasInvalidTransition,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import { kfzAnalyticsReferrerCategoryLabel as referrerLabelFromCategory } from '@/features/inbound/kfz/lib/kfz-analytics-referrer'
import type {
  KfzAnalyticsComparisonRow,
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsPeriodComparison,
  KfzAnalyticsRecord,
} from '@/features/inbound/kfz/types/kfz-analytics'
import {
  KFZ_ANALYTICS_MIN_RATE_GROUP,
  KFZ_ANALYTICS_UNKNOWN_ID,
} from '@/features/inbound/kfz/types/kfz-analytics'

export { KFZ_ANALYTICS_MIN_RATE_GROUP }

export function kfzAnalyticsRatesHidden(sessionCount: number): boolean {
  return sessionCount < KFZ_ANALYTICS_MIN_RATE_GROUP
}

export function kfzAnalyticsAggregateRate(
  numerator: number,
  denominator: number,
  sessionCount: number,
): number | null {
  if (kfzAnalyticsRatesHidden(sessionCount) || denominator <= 0) {
    return null
  }
  return numerator / denominator
}

export function kfzAnalyticsEventInRange(
  iso: string,
  from: string | null,
  to: string,
): boolean {
  if (iso > to) {
    return false
  }
  if (from && iso < from) {
    return false
  }
  return true
}

function latestByKey(events: readonly KfzAnalyticsRecord[]): Map<string, KfzAnalyticsRecord> {
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

export function collectKfzAnalyticsSessionFacts(
  events: readonly KfzAnalyticsRecord[],
  input: {
    nowMs: number
    abandonAfterMs: number
    from: string | null
    to: string
  },
): KfzAnalyticsSessionFacts[] {
  const ranged = events.filter((event) =>
    kfzAnalyticsEventInRange(event.occurredAt, input.from, input.to),
  )
  const latest = [...latestByKey(ranged).values()]
  const bySession = groupEventsBySession(latest)
  const sessions: KfzAnalyticsSessionFacts[] = []
  for (const [sessionId, sessionEvents] of bySession) {
    sessions.push(
      deriveKfzAnalyticsSessionFacts(sessionId, sessionEvents, {
        nowMs: input.nowMs,
        abandonAfterMs: input.abandonAfterMs,
      }),
    )
  }
  return sessions
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

function furthestReachedStepId(facts: KfzAnalyticsSessionFacts): string | null {
  let last: string | null = null
  for (const stepId of KFZ_ANALYTICS_STEP_IDS) {
    if (facts.reachedStepIds.has(stepId)) {
      last = stepId
    }
  }
  return last
}

function modeId(ids: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>()
  for (const id of ids) {
    if (!id) {
      continue
    }
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [id, count] of counts) {
    if (count > bestCount || (count === bestCount && best != null && id.localeCompare(best) < 0)) {
      best = id
      bestCount = count
    }
  }
  return best
}

function countGroupTransitions(factsList: readonly KfzAnalyticsSessionFacts[]): number {
  const edges = new Set<string>()
  for (const facts of factsList) {
    const sessionEdges = new Set<string>()
    for (const event of facts.events) {
      if (
        event.eventName === 'step_view' &&
        event.properties.stepId &&
        event.properties.fromStepId &&
        !recordHasInvalidTransition(event)
      ) {
        if (
          isKfzAnalyticsTransitionAllowed(
            event.properties.fromStepId,
            event.properties.stepId,
            'forward',
          )
        ) {
          sessionEdges.add(`${event.properties.fromStepId}->${event.properties.stepId}`)
        }
      }
      if (
        event.eventName === 'back_navigation' &&
        event.properties.fromStepId &&
        event.properties.stepId &&
        !recordHasInvalidTransition(event)
      ) {
        if (
          isKfzAnalyticsTransitionAllowed(
            event.properties.fromStepId,
            event.properties.stepId,
            'back',
          )
        ) {
          sessionEdges.add(`${event.properties.fromStepId}->${event.properties.stepId}`)
        }
      }
    }
    for (const edge of sessionEdges) {
      edges.add(`${facts.sessionId}:${edge}`)
    }
  }
  return edges.size
}

function stepLabelOrUnknown(id: string | null): string | null {
  if (!id) {
    return null
  }
  if (id === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_LABEL
  }
  return kfzAnalyticsStepLabel(id)
}

export function summarizeKfzAnalyticsComparisonGroup(
  factsList: readonly KfzAnalyticsSessionFacts[],
  input: { id: string; label: string },
): KfzAnalyticsComparisonRow {
  const sessions = factsList.length
  const ratesHidden = kfzAnalyticsRatesHidden(sessions)
  let visits = 0
  let funnelStarts = 0
  let submissions = 0
  let abandoned = 0
  const siteTimes: number[] = []

  for (const facts of factsList) {
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
    }
    if (facts.siteActiveMs != null) {
      const timing = classifyKfzAnalyticsActiveMs(facts.siteActiveMs)
      if (timing.activeMs != null) {
        siteTimes.push(timing.activeMs)
      }
    }
  }

  const topReached = ratesHidden
    ? null
    : modeId(factsList.map((facts) => furthestReachedStepId(facts)))
  const topDropOff = ratesHidden
    ? null
    : modeId(factsList.map((facts) => facts.dropOffStepId))

  return {
    id: input.id,
    label: input.label,
    sessions,
    visits,
    funnelStarts,
    submissions,
    abandoned,
    ratesHidden,
    conversionRate: kfzAnalyticsAggregateRate(submissions, visits, sessions),
    startRate: kfzAnalyticsAggregateRate(funnelStarts, visits, sessions),
    submitFromStartRate: kfzAnalyticsAggregateRate(submissions, funnelStarts, sessions),
    dropOffRate: kfzAnalyticsAggregateRate(abandoned, sessions, sessions),
    averageActiveMs: ratesHidden ? null : average(siteTimes),
    medianActiveMs: ratesHidden ? null : median(siteTimes),
    topReachedStepId: topReached,
    topReachedStepLabel: stepLabelOrUnknown(topReached),
    topDropOffStepId: topDropOff,
    topDropOffStepLabel: stepLabelOrUnknown(topDropOff),
    transitionCount: ratesHidden ? null : countGroupTransitions(factsList),
  }
}

export function compareKfzAnalyticsSessionsBy(
  factsList: readonly KfzAnalyticsSessionFacts[],
  kind: 'source' | 'referrer' | 'branch',
): KfzAnalyticsComparisonRow[] {
  const groups = new Map<string, KfzAnalyticsSessionFacts[]>()
  for (const facts of factsList) {
    const id =
      kind === 'source'
        ? facts.trafficSource
        : kind === 'referrer'
          ? facts.referrerCategory
          : (facts.branchId ?? KFZ_ANALYTICS_UNKNOWN_ID)
    const list = groups.get(id) ?? []
    list.push(facts)
    groups.set(id, list)
  }

  const labelFor = (id: string): string => {
    if (kind === 'source') {
      return kfzAnalyticsTrafficSourceLabel(id)
    }
    if (kind === 'referrer') {
      return id === KFZ_ANALYTICS_UNKNOWN_ID
        ? KFZ_ANALYTICS_UNKNOWN_LABEL
        : referrerLabelFromCategory(id)
    }
    return id === KFZ_ANALYTICS_UNKNOWN_ID ? KFZ_ANALYTICS_UNKNOWN_LABEL : kfzAnalyticsBranchLabel(id)
  }

  return [...groups.entries()]
    .map(([id, group]) =>
      summarizeKfzAnalyticsComparisonGroup(group, { id, label: labelFor(id) }),
    )
    .sort((a, b) => b.visits - a.visits || b.sessions - a.sessions || a.id.localeCompare(b.id))
}

export function resolveKfzAnalyticsPreviousRange(
  filters: KfzAnalyticsDashboardFilters,
  range: { from: string | null; to: string },
): { from: string; to: string } | null {
  if (filters.periodId === 'all') {
    return null
  }

  if (filters.periodId === 'custom' && filters.fromDate && filters.toDate) {
    const days = kfzAnalyticsInclusiveDayCount(filters.fromDate, filters.toDate)
    if (days <= 0) {
      return null
    }
    const previousToDate = addUtcCalendarDays(filters.fromDate, -1)
    const previousFromDate = addUtcCalendarDays(previousToDate, -(days - 1))
    return {
      from: kfzAnalyticsDateToStartIso(previousFromDate),
      to: kfzAnalyticsDateToEndIso(previousToDate),
    }
  }

  const spec = KFZ_ANALYTICS_PERIODS.find((entry) => entry.id === filters.periodId)
  if (!spec || spec.durationMs == null || !range.from) {
    return null
  }
  const currentFromMs = Date.parse(range.from)
  if (!Number.isFinite(currentFromMs)) {
    return null
  }
  const previousToMs = currentFromMs - 1
  const previousFromMs = previousToMs - spec.durationMs + 1
  return {
    from: new Date(previousFromMs).toISOString(),
    to: new Date(previousToMs).toISOString(),
  }
}

export function buildKfzAnalyticsPeriodComparison(
  currentFacts: readonly KfzAnalyticsSessionFacts[],
  previousFacts: readonly KfzAnalyticsSessionFacts[] | null,
  previousRange: { from: string; to: string } | null,
): KfzAnalyticsPeriodComparison {
  const current = summarizeKfzAnalyticsComparisonGroup(currentFacts, {
    id: 'current',
    label: 'Aktueller Zeitraum',
  })
  if (!previousRange) {
    return {
      available: false,
      previousFrom: null,
      previousTo: null,
      current,
      previous: null,
    }
  }
  return {
    available: true,
    previousFrom: previousRange.from,
    previousTo: previousRange.to,
    current,
    previous: summarizeKfzAnalyticsComparisonGroup(previousFacts ?? [], {
      id: 'previous',
      label: 'Vorheriger Zeitraum',
    }),
  }
}
