'use client'

import { useMemo, useState, useTransition } from 'react'

import { recordKfzAnalyticsPreviewAction } from '@/features/inbound/kfz/actions/kfz-analytics-preview'
import { KfzAnalyticsDashboardView } from '@/features/inbound/kfz/components/kfz-analytics-dashboard'
import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  KFZ_ANALYTICS_DEFAULT_FILTERS,
  buildKfzAnalyticsDashboardHref,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import { KFZ_ANALYTICS_FIXTURE_ALL } from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import type {
  KfzAnalyticsDashboardFilters,
  KfzAnalyticsRecord,
} from '@/features/inbound/kfz/types/kfz-analytics'

type KfzAnalyticsPreviewAppProps = {
  initialEvents: KfzAnalyticsRecord[]
}

export function KfzAnalyticsPreviewApp({ initialEvents }: KfzAnalyticsPreviewAppProps) {
  const [filters, setFilters] = useState<KfzAnalyticsDashboardFilters>({
    ...KFZ_ANALYTICS_DEFAULT_FILTERS,
    periodId: 'all',
  })
  const [events, setEvents] = useState(initialEvents)
  const [isPending, startTransition] = useTransition()
  const [nowMs] = useState(() => Date.now())

  const dashboard = useMemo(
    () =>
      aggregateKfzAnalyticsDashboard(events, {
        periodId: filters.periodId,
        nowMs,
        filters,
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
    [events, filters, nowMs],
  )

  function seedFixtures() {
    startTransition(async () => {
      await recordKfzAnalyticsPreviewAction({
        consent: 'granted',
        events: KFZ_ANALYTICS_FIXTURE_ALL,
      })
      setEvents(KFZ_ANALYTICS_FIXTURE_ALL)
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
      <p className="sr-only" data-kfz-analytics-preview-href={buildKfzAnalyticsDashboardHref(filters)}>
        Filter bleiben lokal. Ein Reload verdoppelt keine Ereignisse.
      </p>
      <KfzAnalyticsDashboardView
        dashboard={dashboard}
        filters={filters}
        defaultPeriodId="all"
        onFiltersChange={setFilters}
        events={events}
        inspector
      />
    </div>
  )
}
