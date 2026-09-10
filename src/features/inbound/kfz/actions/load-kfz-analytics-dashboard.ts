'use server'

import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import { resolveKfzAnalyticsDashboardFilters } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import { createAuthenticatedKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import type {
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardQuery,
} from '@/features/inbound/kfz/types/kfz-analytics'

export async function loadKfzAnalyticsDashboardAction(
  query: KfzAnalyticsDashboardQuery = {},
): Promise<
  | { ok: true; dashboard: KfzAnalyticsDashboard }
  | { ok: false; error: string }
> {
  const agency = await getCurrentUserAgency()
  if (!agency.success) {
    return { ok: false, error: agency.error }
  }

  try {
    const nowMs = Date.now()
    const resolved = resolveKfzAnalyticsDashboardFilters(query, nowMs)
    const store = await createAuthenticatedKfzAnalyticsStore(agency.agency.id)
    const events = await store.listEvents({
      from: resolved.from,
      to: resolved.to,
    })
    return {
      ok: true,
      dashboard: aggregateKfzAnalyticsDashboard(events, {
        nowMs,
        query,
        periodId: resolved.filters.periodId,
      }),
    }
  } catch {
    return {
      ok: false,
      error: 'Die Kfz-Messdaten konnten nicht geladen werden.',
    }
  }
}
