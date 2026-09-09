'use server'

import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import {
  aggregateKfzAnalyticsDashboard,
  resolveKfzAnalyticsPeriod,
} from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import { createAuthenticatedKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import type {
  KfzAnalyticsDashboard,
  KfzAnalyticsPeriodId,
} from '@/features/inbound/kfz/types/kfz-analytics'

const PERIODS = new Set<KfzAnalyticsPeriodId>(['24h', '7d', '30d', 'all'])

export async function loadKfzAnalyticsDashboardAction(
  periodId: KfzAnalyticsPeriodId = '7d',
): Promise<
  | { ok: true; dashboard: KfzAnalyticsDashboard }
  | { ok: false; error: string }
> {
  const safePeriod: KfzAnalyticsPeriodId = PERIODS.has(periodId) ? periodId : '7d'
  const agency = await getCurrentUserAgency()
  if (!agency.success) {
    return { ok: false, error: agency.error }
  }

  try {
    const store = await createAuthenticatedKfzAnalyticsStore(agency.agency.id)
    const range = resolveKfzAnalyticsPeriod(safePeriod, Date.now())
    const events = await store.listEvents(range)
    return {
      ok: true,
      dashboard: aggregateKfzAnalyticsDashboard(events, {
        periodId: safePeriod,
        nowMs: Date.now(),
      }),
    }
  } catch {
    return {
      ok: false,
      error: 'Die Kfz-Messdaten konnten nicht geladen werden.',
    }
  }
}
