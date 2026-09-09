import { WorkspaceFrame } from '@/components/app/workspace'
import { loadKfzAnalyticsDashboardAction } from '@/features/inbound/kfz/actions/load-kfz-analytics-dashboard'
import { KfzAnalyticsDashboardApp } from '@/features/inbound/kfz/components/kfz-analytics-dashboard-app'
import type { KfzAnalyticsPeriodId } from '@/features/inbound/kfz/types/kfz-analytics'
import { aosAlertErrorClassName } from '@/lib/design-system'

export const dynamic = 'force-dynamic'

const PERIODS = new Set<KfzAnalyticsPeriodId>(['24h', '7d', '30d', 'all'])

type KfzAnalyticsPageProps = {
  searchParams: Promise<{ period?: string }>
}

export default async function KfzAnalyticsPage({ searchParams }: KfzAnalyticsPageProps) {
  const params = await searchParams
  const periodId: KfzAnalyticsPeriodId = PERIODS.has(params.period as KfzAnalyticsPeriodId)
    ? (params.period as KfzAnalyticsPeriodId)
    : '7d'
  const result = await loadKfzAnalyticsDashboardAction(periodId)

  if (!result.ok) {
    return (
      <WorkspaceFrame>
        <div className={`${aosAlertErrorClassName} px-5 py-4`}>{result.error}</div>
      </WorkspaceFrame>
    )
  }

  return (
    <WorkspaceFrame>
      <KfzAnalyticsDashboardApp dashboard={result.dashboard} periodId={periodId} />
    </WorkspaceFrame>
  )
}
