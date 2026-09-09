'use client'

import { useMemo, useState, useTransition } from 'react'

import { recordKfzAnalyticsPreviewAction } from '@/features/inbound/kfz/actions/kfz-analytics-preview'
import { KfzAnalyticsDashboardView } from '@/features/inbound/kfz/components/kfz-analytics-dashboard'
import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import { KFZ_ANALYTICS_FIXTURE_ALL } from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import type {
  KfzAnalyticsPeriodId,
  KfzAnalyticsRecord,
} from '@/features/inbound/kfz/types/kfz-analytics'

type KfzAnalyticsPreviewAppProps = {
  initialEvents: KfzAnalyticsRecord[]
}

export function KfzAnalyticsPreviewApp({ initialEvents }: KfzAnalyticsPreviewAppProps) {
  const [periodId, setPeriodId] = useState<KfzAnalyticsPeriodId>('all')
  const [events, setEvents] = useState(initialEvents)
  const [isPending, startTransition] = useTransition()

  const dashboard = useMemo(
    () =>
      aggregateKfzAnalyticsDashboard(events, {
        periodId,
        nowMs: Date.now(),
      }),
    [events, periodId],
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
      <KfzAnalyticsDashboardView
        dashboard={dashboard}
        periodId={periodId}
        onPeriodChange={setPeriodId}
        events={events}
        inspector
      />
    </div>
  )
}
