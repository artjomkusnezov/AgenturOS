'use server'

import { loadKfzAnalyticsDashboardAction } from '@/features/inbound/kfz/actions/load-kfz-analytics-dashboard'
import { exportKfzAnalyticsDecisionFromLoad } from '@/features/inbound/kfz/lib/kfz-analytics-export'
import type { KfzAnalyticsDecisionExportResult } from '@/features/inbound/kfz/lib/kfz-analytics-export'
import type { KfzAnalyticsDashboardQuery } from '@/features/inbound/kfz/types/kfz-analytics'

/**
 * Authorized aggregate export of the current Kfz decision view.
 * Reuses the existing dashboard load (agency gate + aggregate query).
 * No second store and no session, answer or contact fields.
 */
export async function exportKfzAnalyticsDecisionAction(
  query: KfzAnalyticsDashboardQuery = {},
): Promise<KfzAnalyticsDecisionExportResult> {
  const loaded = await loadKfzAnalyticsDashboardAction(query)
  return exportKfzAnalyticsDecisionFromLoad(loaded)
}
