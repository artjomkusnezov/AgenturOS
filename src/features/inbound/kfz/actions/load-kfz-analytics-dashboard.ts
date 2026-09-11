'use server'

import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import { resolveKfzAnalyticsPreviousRange } from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import { resolveKfzAnalyticsDashboardFilters } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import {
  classifyKfzAnalyticsDashboardFailure,
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import { createAuthenticatedKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import type {
  KfzAnalyticsDashboardLoadResult,
  KfzAnalyticsDashboardQuery,
} from '@/features/inbound/kfz/types/kfz-analytics'
import { getPublicSupabaseBootState } from '@/lib/supabase/public-config'

export async function loadKfzAnalyticsDashboardAction(
  query: KfzAnalyticsDashboardQuery = {},
): Promise<KfzAnalyticsDashboardLoadResult> {
  const boot = getPublicSupabaseBootState()
  if (!boot.ready) {
    return {
      ok: false,
      status: 'configuration_missing',
      error: KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
    }
  }

  try {
    const agency = await getCurrentUserAgency()
    if (!agency.success) {
      return {
        ok: false,
        status: 'unavailable',
        error: KFZ_ANALYTICS_UNAVAILABLE_ERROR,
      }
    }

    const nowMs = Date.now()
    const resolved = resolveKfzAnalyticsDashboardFilters(query, nowMs)
    const previous = resolveKfzAnalyticsPreviousRange(resolved.filters, resolved)
    const store = await createAuthenticatedKfzAnalyticsStore(agency.agency.id)
    const events = await store.listEvents({
      from: previous?.from ?? resolved.from,
      to: resolved.to,
    })
    return {
      ok: true,
      status: 'ready',
      dashboard: aggregateKfzAnalyticsDashboard(events, {
        nowMs,
        query,
        periodId: resolved.filters.periodId,
      }),
    }
  } catch (error) {
    return classifyKfzAnalyticsDashboardFailure(error)
  }
}
