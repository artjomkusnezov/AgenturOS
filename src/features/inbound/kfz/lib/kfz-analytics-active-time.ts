import { KFZ_ANALYTICS_ACTIVE_MS_CAP } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'

export type KfzAnalyticsClock = {
  now(): number
}

export type KfzAnalyticsVisibility = {
  hidden(): boolean
}

export type KfzAnalyticsTimingSnapshot = {
  totalActiveMs: number
  stepActiveMs: Record<string, number>
  currentStepId: string | null
  runningSince: number | null
}

export function emptyKfzAnalyticsTiming(): KfzAnalyticsTimingSnapshot {
  return {
    totalActiveMs: 0,
    stepActiveMs: {},
    currentStepId: null,
    runningSince: null,
  }
}

function cap(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) {
    return 0
  }
  return Math.min(Math.round(ms), KFZ_ANALYTICS_ACTIVE_MS_CAP)
}

function elapsed(from: number, to: number): number {
  return cap(Math.max(0, to - from))
}

/**
 * Active time excluding hidden/background. Hidden intervals are not added.
 */
export function tickKfzAnalyticsTiming(
  snapshot: KfzAnalyticsTimingSnapshot,
  input: {
    now: number
    hidden: boolean
    stepId?: string | null
  },
): KfzAnalyticsTimingSnapshot {
  const next: KfzAnalyticsTimingSnapshot = {
    totalActiveMs: snapshot.totalActiveMs,
    stepActiveMs: { ...snapshot.stepActiveMs },
    currentStepId: input.stepId === undefined ? snapshot.currentStepId : input.stepId,
    runningSince: snapshot.runningSince,
  }

  if (next.runningSince != null && !input.hidden) {
    const delta = elapsed(next.runningSince, input.now)
    next.totalActiveMs = cap(next.totalActiveMs + delta)
    if (snapshot.currentStepId) {
      next.stepActiveMs[snapshot.currentStepId] = cap(
        (next.stepActiveMs[snapshot.currentStepId] ?? 0) + delta,
      )
    }
  }

  next.runningSince = input.hidden ? null : input.now
  return next
}

export function readKfzAnalyticsStepActiveMs(
  snapshot: KfzAnalyticsTimingSnapshot,
  stepId: string,
  now: number,
  hidden: boolean,
): number {
  const live = tickKfzAnalyticsTiming(snapshot, { now, hidden, stepId: snapshot.currentStepId })
  return live.stepActiveMs[stepId] ?? 0
}

export function readKfzAnalyticsTotalActiveMs(
  snapshot: KfzAnalyticsTimingSnapshot,
  now: number,
  hidden: boolean,
): number {
  return tickKfzAnalyticsTiming(snapshot, {
    now,
    hidden,
    stepId: snapshot.currentStepId,
  }).totalActiveMs
}
