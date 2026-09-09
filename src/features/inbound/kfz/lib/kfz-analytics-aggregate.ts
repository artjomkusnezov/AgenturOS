import {
  kfzAnalyticsBranchLabel,
  kfzAnalyticsStepLabel,
  KFZ_ANALYTICS_STEP_IDS,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import { KFZ_ANALYTICS_ABANDON_AFTER_MS } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import type {
  KfzAnalyticsCountRow,
  KfzAnalyticsDashboard,
  KfzAnalyticsErrorCategory,
  KfzAnalyticsPeriodId,
  KfzAnalyticsRecord,
  KfzAnalyticsStepFunnelRow,
} from '@/features/inbound/kfz/types/kfz-analytics'

export const KFZ_ANALYTICS_PERIODS: ReadonlyArray<{
  id: KfzAnalyticsPeriodId
  label: string
  durationMs: number | null
}> = [
  { id: '24h', label: '24 Stunden', durationMs: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 Tage', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 Tage', durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'Gesamt', durationMs: null },
]

export function resolveKfzAnalyticsPeriod(
  periodId: KfzAnalyticsPeriodId,
  nowMs: number,
): { from: string | null; to: string } {
  const spec = KFZ_ANALYTICS_PERIODS.find((entry) => entry.id === periodId)
  const to = new Date(nowMs).toISOString()
  if (!spec || spec.durationMs == null) {
    return { from: null, to }
  }
  return { from: new Date(nowMs - spec.durationMs).toISOString(), to }
}

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

export function aggregateKfzAnalyticsDashboard(
  events: readonly KfzAnalyticsRecord[],
  input: {
    periodId: KfzAnalyticsPeriodId
    nowMs: number
    abandonAfterMs?: number
  },
): KfzAnalyticsDashboard {
  const { from, to } = resolveKfzAnalyticsPeriod(input.periodId, input.nowMs)
  const abandonAfterMs = input.abandonAfterMs ?? KFZ_ANALYTICS_ABANDON_AFTER_MS
  const ranged = events.filter((event) => inRange(event.occurredAt, from, to))
  const latest = [...latestByKey(ranged).values()]

  const bySession = new Map<string, KfzAnalyticsRecord[]>()
  for (const event of latest) {
    const list = bySession.get(event.sessionId) ?? []
    list.push(event)
    bySession.set(event.sessionId, list)
  }

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
  const reached = new Map<string, Set<string>>()
  const completed = new Map<string, Set<string>>()
  const dropOff = new Map<string, number>()
  const landingTimes: number[] = []
  const stepTimes = new Map<string, number[]>()

  for (const [sessionId, sessionEvents] of bySession) {
    const names = new Set(sessionEvents.map((event) => event.eventName))
    if (names.has('landing_view')) {
      visits += 1
    }
    if (names.has('funnel_start')) {
      funnelStarts += 1
    }
    if (names.has('submit_succeeded')) {
      submissions += 1
    }
    validationBlocked += sessionEvents.filter((event) => event.eventName === 'validation_blocked')
      .length
    for (const event of sessionEvents) {
      if (event.eventName === 'submit_failed') {
        submitFailed += 1
        const category = event.properties.errorCategory ?? 'unknown'
        submitFailedByCategory.set(
          category,
          (submitFailedByCategory.get(category) ?? 0) + 1,
        )
      }
      if (event.eventName === 'traffic_source') {
        const source = event.properties.trafficSource ?? 'direct'
        trafficSources.set(source, (trafficSources.get(source) ?? 0) + 1)
        if (event.properties.utmCampaign) {
          campaigns.set(
            event.properties.utmCampaign,
            (campaigns.get(event.properties.utmCampaign) ?? 0) + 1,
          )
        }
      }
      if (event.eventName === 'initial_branch_selected' && event.properties.branchId) {
        branches.set(
          event.properties.branchId,
          (branches.get(event.properties.branchId) ?? 0) + 1,
        )
      }
      if (event.eventName === 'step_view' && event.properties.stepId) {
        const set = reached.get(event.properties.stepId) ?? new Set()
        set.add(sessionId)
        reached.set(event.properties.stepId, set)
        if (typeof event.properties.activeMs === 'number') {
          const times = stepTimes.get(event.properties.stepId) ?? []
          times.push(event.properties.activeMs)
          stepTimes.set(event.properties.stepId, times)
        }
      }
      if (event.eventName === 'step_completed' && event.properties.stepId) {
        const set = completed.get(event.properties.stepId) ?? new Set()
        set.add(sessionId)
        completed.set(event.properties.stepId, set)
      }
      if (
        event.eventName === 'landing_view' &&
        typeof event.properties.activeMs === 'number'
      ) {
        landingTimes.push(event.properties.activeMs)
      }
    }

    const succeeded = names.has('submit_succeeded')
    const lastEvent = sessionEvents.reduce((latestEvent, event) =>
      event.occurredAt > latestEvent.occurredAt ? event : latestEvent,
    )
    const lastMs = Date.parse(lastEvent.occurredAt)
    const timedOut =
      Number.isFinite(lastMs) && input.nowMs - lastMs >= abandonAfterMs
    const isAbandoned =
      !succeeded && (names.has('funnel_abandoned') || timedOut)
    if (isAbandoned) {
      abandoned += 1
      const lastStep =
        sessionEvents.find((event) => event.eventName === 'funnel_abandoned')
          ?.properties.lastStepId ??
        [...sessionEvents]
          .filter((event) => event.eventName === 'step_view' && event.properties.stepId)
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
          .at(-1)?.properties.stepId ??
        'branch'
      dropOff.set(lastStep, (dropOff.get(lastStep) ?? 0) + 1)
    }
  }

  const stepIds = KFZ_ANALYTICS_STEP_IDS.filter(
    (stepId) => (reached.get(stepId)?.size ?? 0) > 0 || (dropOff.get(stepId) ?? 0) > 0,
  )

  const steps: KfzAnalyticsStepFunnelRow[] = stepIds.map((stepId) => {
    const reachedCount = reached.get(stepId)?.size ?? 0
    const completedCount = completed.get(stepId)?.size ?? 0
    const dropOffCount = dropOff.get(stepId) ?? 0
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

  const empty = latest.length === 0

  return {
    periodId: input.periodId,
    from,
    to,
    empty,
    visits,
    funnelStarts,
    submissions,
    conversionRate: visits > 0 ? submissions / visits : null,
    trafficSources: countMapToRows(trafficSources, (id) => id),
    campaigns: countMapToRows(campaigns, (id) => id),
    branches: countMapToRows(branches, kfzAnalyticsBranchLabel),
    steps,
    validationBlocked,
    submitFailed,
    submitFailedByCategory: countMapToRows(submitFailedByCategory, (id) => id),
    landingAverageActiveMs: average(landingTimes),
    landingMedianActiveMs: median(landingTimes),
    abandoned,
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
