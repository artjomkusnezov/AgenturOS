import { WorkspaceFrame } from '@/components/app/workspace'
import { loadKfzAnalyticsDashboardAction } from '@/features/inbound/kfz/actions/load-kfz-analytics-dashboard'
import { KfzAnalyticsDashboardApp } from '@/features/inbound/kfz/components/kfz-analytics-dashboard-app'
import { KfzAnalyticsReviewScreen } from '@/features/inbound/kfz/components/kfz-analytics-dashboard'
import { parseKfzAnalyticsDashboardQuery } from '@/features/inbound/kfz/lib/kfz-analytics-filters'

export const dynamic = 'force-dynamic'

type KfzAnalyticsPageProps = {
  searchParams: Promise<{
    period?: string
    from?: string
    to?: string
    source?: string
    branch?: string
    step?: string
    drop?: string
  }>
}

export default async function KfzAnalyticsPage({ searchParams }: KfzAnalyticsPageProps) {
  const params = await searchParams
  const query = parseKfzAnalyticsDashboardQuery(params)
  const result = await loadKfzAnalyticsDashboardAction(query)

  if (!result.ok) {
    return (
      <WorkspaceFrame>
        <KfzAnalyticsReviewScreen status={result.status} />
      </WorkspaceFrame>
    )
  }

  return (
    <WorkspaceFrame>
      <KfzAnalyticsDashboardApp
        dashboard={result.dashboard}
        filters={result.dashboard.filters}
      />
    </WorkspaceFrame>
  )
}
