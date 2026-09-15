'use client'

import { useMemo, useState, useTransition } from 'react'

import { recordKfzAnalyticsPreviewAction } from '@/features/inbound/kfz/actions/kfz-analytics-preview'
import {
  KfzAnalyticsDashboardView,
  KfzAnalyticsReviewScreen,
} from '@/features/inbound/kfz/components/kfz-analytics-dashboard'
import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  buildKfzAnalyticsDashboardHref,
  KFZ_ANALYTICS_DEFAULT_FILTERS,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  buildKfzAnalyticsPeriodTrendFixture,
  KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS,
  KFZ_ANALYTICS_PERIOD_TREND_SCENARIOS,
  type KfzAnalyticsPeriodTrendScenario,
} from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import { emptyKfzAnalyticsHealthFacts } from '@/features/inbound/kfz/lib/kfz-analytics-health'
import type {
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsHealthFacts,
  KfzAnalyticsRecord,
  KfzAnalyticsReviewStatus,
  KfzAnalyticsTrendPeriodId,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { KFZ_ANALYTICS_TREND_PERIODS } from '@/features/inbound/kfz/types/kfz-analytics'

type KfzAnalyticsPreviewAppProps = {
  initialEvents: KfzAnalyticsRecord[]
}

const PREVIEW_DEFAULT_FILTERS: KfzAnalyticsDashboardFilters = {
  ...KFZ_ANALYTICS_DEFAULT_FILTERS,
  periodId: 'all',
}

export function KfzAnalyticsPreviewApp({ initialEvents }: KfzAnalyticsPreviewAppProps) {
  const [filters, setFilters] = useState<KfzAnalyticsDashboardFilters>(PREVIEW_DEFAULT_FILTERS)
  const [events, setEvents] = useState(initialEvents)
  const [health, setHealth] = useState<KfzAnalyticsHealthFacts>(() => ({
    ...emptyKfzAnalyticsHealthFacts(),
    accepted: initialEvents.length,
  }))
  const [reviewStatus, setReviewStatus] = useState<KfzAnalyticsReviewStatus>('ready')
  const [trendScenario, setTrendScenario] = useState<KfzAnalyticsPeriodTrendScenario | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()
  const [nowMs] = useState(() => Date.now())

  function isTrendPeriod(periodId: string): periodId is KfzAnalyticsTrendPeriodId {
    return (KFZ_ANALYTICS_TREND_PERIODS as readonly string[]).includes(periodId)
  }

  function eventsForTrend(
    scenario: KfzAnalyticsPeriodTrendScenario,
    periodId: string,
  ): KfzAnalyticsRecord[] {
    const trendPeriod = isTrendPeriod(periodId) ? periodId : '7d'
    return buildKfzAnalyticsPeriodTrendFixture({
      nowMs,
      periodId: trendPeriod,
      scenario,
    })
  }

  const dashboard = useMemo(
    () =>
      aggregateKfzAnalyticsDashboard(events, {
        periodId: filters.periodId,
        nowMs,
        filters,
        ingestHealth: { available: true, facts: health },
        query: {
          period: filters.periodId === 'custom' ? 'custom' : filters.periodId,
          from: filters.fromDate ?? undefined,
          to: filters.toDate ?? undefined,
          source: filters.trafficSource,
          branch: filters.branchId,
          step: filters.reachedStepId,
          drop: filters.dropOffStepId,
        },
      }),
    [events, filters, health, nowMs],
  )

  function applyFilters(next: KfzAnalyticsDashboardFilters) {
    const rebuild =
      trendScenario != null &&
      isTrendPeriod(next.periodId) &&
      next.periodId !== filters.periodId
    const nextEvents = rebuild ? eventsForTrend(trendScenario, next.periodId) : null
    if (nextEvents) {
      setEvents(nextEvents)
    }
    setFilters(next)
    if (typeof window !== 'undefined') {
      const href = buildKfzAnalyticsDashboardHref(next, '/dev/kfz-analytics')
      window.history.replaceState(null, '', href)
    }
  }

  function seedFixtures() {
    startTransition(async () => {
      const result = await recordKfzAnalyticsPreviewAction({
        consent: 'granted',
        events: [...KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS],
      })
      setTrendScenario(null)
      setEvents([...KFZ_ANALYTICS_FIXTURE_DECISION_PERIODS])
      setHealth(result.health)
    })
  }

  function seedTrend(scenario: KfzAnalyticsPeriodTrendScenario) {
    const periodId = isTrendPeriod(filters.periodId) ? filters.periodId : '7d'
    const events = eventsForTrend(scenario, periodId)
    startTransition(async () => {
      const result = await recordKfzAnalyticsPreviewAction({
        consent: 'granted',
        events,
      })
      setTrendScenario(scenario)
      setFilters({
        ...filters,
        periodId,
        fromDate: null,
        toDate: null,
      })
      setEvents(events)
      setHealth(result.health)
      setReviewStatus('ready')
    })
  }

  const trendLabels: Record<KfzAnalyticsPeriodTrendScenario, string> = {
    improving: 'Aktuell höher',
    declining: 'Aktuell niedriger',
    equal: 'Gleich',
    suppressed: 'Unterdrückt',
    empty: 'Trend leer',
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
        Lokale Vorschau der internen Kfz-Messung. Production gibt 404. Nichts wird
        an Kundinnen gesendet. Fixtures sind anonym und enthalten keine Antworten.
      </p>
      <button
        type="button"
        className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white"
        data-kfz-analytics-seed="true"
        disabled={isPending}
        onClick={seedFixtures}
      >
        {isPending ? 'Lädt …' : 'Anonyme Beispielereignisse laden'}
      </button>
      <div className="flex flex-wrap gap-2" data-kfz-analytics-trend-scenarios="true">
        {KFZ_ANALYTICS_PERIOD_TREND_SCENARIOS.map((scenario) => (
          <button
            key={scenario}
            type="button"
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
            data-kfz-analytics-trend-scenario={scenario}
            disabled={isPending}
            onClick={() => seedTrend(scenario)}
          >
            {trendLabels[scenario]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" data-kfz-analytics-preview-states="true">
        {(
          [
            ['ready', 'Bereit'],
            ['empty', 'Leer'],
            ['unavailable', 'Nicht verfügbar'],
            ['configuration_missing', 'Nicht konfiguriert'],
          ] as const
        ).map(([status, label]) => (
          <button
            key={status}
            type="button"
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
            data-kfz-analytics-preview-state={status}
            onClick={() => setReviewStatus(status)}
          >
            {label}
          </button>
        ))}
      </div>
      {reviewStatus === 'ready' ? (
        <KfzAnalyticsDashboardView
          dashboard={dashboard}
          filters={filters}
          defaultPeriodId="all"
          onFiltersChange={applyFilters}
          events={events}
          inspector
        />
      ) : (
        <KfzAnalyticsReviewScreen
          status={reviewStatus}
          dashboard={reviewStatus === 'empty' ? { ...dashboard, empty: true } : undefined}
        />
      )}
    </div>
  )
}
