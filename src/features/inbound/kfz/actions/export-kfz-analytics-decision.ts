'use server'

import { loadKfzAnalyticsDashboardAction } from '@/features/inbound/kfz/actions/load-kfz-analytics-dashboard'
import { authorizeKfzAnalyticsDecisionExport } from '@/features/inbound/kfz/lib/kfz-analytics-export'
import type {
  KfzAnalyticsDashboardQuery,
  KfzAnalyticsDecisionExportResult,
} from '@/features/inbound/kfz/types/kfz-analytics'

export async function exportKfzAnalyticsDecisionAction(
  query: KfzAnalyticsDashboardQuery = {},
): Promise<KfzAnalyticsDecisionExportResult> {
  const result = await loadKfzAnalyticsDashboardAction(query)
  return authorizeKfzAnalyticsDecisionExport(result)
}
