import {
  kfzAnalyticsBranchLabel,
  kfzAnalyticsStepLabel,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import {
  kfzAnalyticsRatesHidden,
  isKfzAnalyticsTrendPeriod,
} from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import {
  KFZ_ANALYTICS_UNKNOWN_LABEL,
  type KfzAnalyticsSessionFacts,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  isKfzAnalyticsTransitionAllowed,
  recordHasInvalidTransition,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import { kfzAnalyticsCoarseSourceLabel, kfzAnalyticsSourceBranchComparisonId } from '@/features/inbound/kfz/lib/kfz-analytics-traffic-source'
import type {
  KfzAnalyticsBottleneckFactRow,
  KfzAnalyticsBottleneckGroup,
  KfzAnalyticsBottleneckSummary,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_UNKNOWN_ID } from '@/features/inbound/kfz/types/kfz-analytics'

export function isKfzAnalyticsBottleneckPeriod(periodId: string): boolean {
  return isKfzAnalyticsTrendPeriod(periodId)
}

export function emptyKfzAnalyticsBottleneckSummary(): KfzAnalyticsBottleneckSummary {
  return {
    available: false,
    overall: null,
    sourceBranch: [],
  }
}

function stepLabelOrUnknown(id: string): string {
  if (id === KFZ_ANALYTICS_UNKNOWN_ID) {
    return KFZ_ANALYTICS_UNKNOWN_LABEL
  }
  return kfzAnalyticsStepLabel(id)
}

function sourceBranchLabel(id: string): string {
  const [coarseId, branchPart] = id.split(':')
  const branchId = branchPart || KFZ_ANALYTICS_UNKNOWN_ID
  const branchLabel =
    branchId === KFZ_ANALYTICS_UNKNOWN_ID
      ? KFZ_ANALYTICS_UNKNOWN_LABEL
      : kfzAnalyticsBranchLabel(branchId)
  return `${kfzAnalyticsCoarseSourceLabel(coarseId ?? KFZ_ANALYTICS_UNKNOWN_ID)} · ${branchLabel}`
}

function sortFactRows(rows: KfzAnalyticsBottleneckFactRow[]): KfzAnalyticsBottleneckFactRow[] {
  return [...rows].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
}

function countMapToFacts(
  counts: Map<string, number>,
  labelFor: (id: string) => string,
): KfzAnalyticsBottleneckFactRow[] {
  return sortFactRows(
    [...counts.entries()].map(([id, count]) => ({
      id,
      label: labelFor(id),
      count,
    })),
  )
}

function collectAllowedTransitions(
  factsList: readonly KfzAnalyticsSessionFacts[],
): Map<string, number> {
  const sessionsByEdge = new Map<string, Set<string>>()

  function addEdge(sessionId: string, fromStepId: string, toStepId: string, kind: 'forward' | 'back') {
    if (!fromStepId || !toStepId || fromStepId === toStepId) {
      return
    }
    if (!isKfzAnalyticsTransitionAllowed(fromStepId, toStepId, kind)) {
      return
    }
    const id = `${fromStepId}->${toStepId}`
    const sessions = sessionsByEdge.get(id) ?? new Set<string>()
    sessions.add(sessionId)
    sessionsByEdge.set(id, sessions)
  }

  for (const facts of factsList) {
    for (const event of facts.events) {
      if (
        event.eventName === 'step_view' &&
        event.properties.stepId &&
        event.properties.fromStepId &&
        !recordHasInvalidTransition(event)
      ) {
        addEdge(facts.sessionId, event.properties.fromStepId, event.properties.stepId, 'forward')
      }
      if (
        event.eventName === 'back_navigation' &&
        event.properties.fromStepId &&
        event.properties.stepId &&
        !recordHasInvalidTransition(event)
      ) {
        addEdge(facts.sessionId, event.properties.fromStepId, event.properties.stepId, 'back')
      }
    }
  }

  return new Map([...sessionsByEdge.entries()].map(([id, sessions]) => [id, sessions.size]))
}

function collectReached(factsList: readonly KfzAnalyticsSessionFacts[]): Map<string, number> {
  const sessionsByStep = new Map<string, Set<string>>()
  for (const facts of factsList) {
    for (const stepId of facts.reachedStepIds) {
      const sessions = sessionsByStep.get(stepId) ?? new Set<string>()
      sessions.add(facts.sessionId)
      sessionsByStep.set(stepId, sessions)
    }
  }
  return new Map([...sessionsByStep.entries()].map(([id, sessions]) => [id, sessions.size]))
}

function collectStops(factsList: readonly KfzAnalyticsSessionFacts[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const facts of factsList) {
    if (!facts.abandoned) {
      continue
    }
    const id = facts.dropOffStepId ?? KFZ_ANALYTICS_UNKNOWN_ID
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

export function summarizeKfzAnalyticsBottleneckGroup(
  factsList: readonly KfzAnalyticsSessionFacts[],
  input: { id: string; label: string },
): KfzAnalyticsBottleneckGroup {
  const sessions = factsList.length
  const ratesHidden = kfzAnalyticsRatesHidden(sessions)
  if (ratesHidden) {
    return {
      id: input.id,
      label: input.label,
      sessions,
      ratesHidden: true,
      reached: [],
      stops: [],
      transitions: [],
    }
  }

  return {
    id: input.id,
    label: input.label,
    sessions,
    ratesHidden: false,
    reached: countMapToFacts(collectReached(factsList), stepLabelOrUnknown),
    stops: countMapToFacts(collectStops(factsList), stepLabelOrUnknown),
    transitions: countMapToFacts(collectAllowedTransitions(factsList), (id) => {
      const [fromStepId, toStepId] = id.split('->')
      return `${stepLabelOrUnknown(fromStepId ?? KFZ_ANALYTICS_UNKNOWN_ID)} → ${stepLabelOrUnknown(toStepId ?? KFZ_ANALYTICS_UNKNOWN_ID)}`
    }),
  }
}

export function buildKfzAnalyticsBottleneckSummary(input: {
  periodId: string
  facts: readonly KfzAnalyticsSessionFacts[]
}): KfzAnalyticsBottleneckSummary {
  if (!isKfzAnalyticsBottleneckPeriod(input.periodId)) {
    return emptyKfzAnalyticsBottleneckSummary()
  }

  const groups = new Map<string, KfzAnalyticsSessionFacts[]>()
  for (const facts of input.facts) {
    const id = kfzAnalyticsSourceBranchComparisonId(facts.coarseSource, facts.branchId)
    const list = groups.get(id) ?? []
    list.push(facts)
    groups.set(id, list)
  }

  return {
    available: true,
    overall: summarizeKfzAnalyticsBottleneckGroup(input.facts, {
      id: 'overall',
      label: 'Gesamt',
    }),
    sourceBranch: [...groups.entries()]
      .map(([id, group]) =>
        summarizeKfzAnalyticsBottleneckGroup(group, { id, label: sourceBranchLabel(id) }),
      )
      .sort((a, b) => b.sessions - a.sessions || a.id.localeCompare(b.id)),
  }
}

export function kfzAnalyticsBottleneckFactCount(
  rows: readonly KfzAnalyticsBottleneckFactRow[],
  id: string | null | undefined,
): number | null {
  if (!id) {
    return null
  }
  return rows.find((row) => row.id === id)?.count ?? null
}
