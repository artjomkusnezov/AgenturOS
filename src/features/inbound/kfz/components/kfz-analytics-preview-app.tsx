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
  KFZ_ANALYTICS_FIXTURE_COMPARISON,
  KFZ_ANALYTICS_FIXTURE_PREVIOUS_WINDOW,
} from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import { emptyKfzAnalyticsHealthFacts } from '@/features/inbound/kfz/lib/kfz-analytics-health'
import type {
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsHealthFacts,
  KfzAnalyticsRecord,
  KfzAnalyticsReviewStatus,
} from '@/features/inbound/kfz/types/kfz-analytics'

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
  const [isPending, startTransition] = useTransition()
  const [nowMs] = useState(() => Date.now())

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
        events: [...KFZ_ANALYTICS_FIXTURE_COMPARISON, ...KFZ_ANALYTICS_FIXTURE_PREVIOUS_WINDOW],
      })
      setEvents([...KFZ_ANALYTICS_FIXTURE_COMPARISON, ...KFZ_ANALYTICS_FIXTURE_PREVIOUS_WINDOW])
      setHealth(result.health)
    })
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
