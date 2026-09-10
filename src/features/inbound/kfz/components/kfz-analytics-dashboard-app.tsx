'use client'

import { useRouter } from 'next/navigation'

import { KfzAnalyticsDashboardView } from '@/features/inbound/kfz/components/kfz-analytics-dashboard'
import { buildKfzAnalyticsDashboardHref } from '@/features/inbound/kfz/lib/kfz-analytics-filters'
import type {
  KfzAnalyticsDashboard,
  KfzAnalyticsDashboardFilters,
} from '@/features/inbound/kfz/types/kfz-analytics'

export function KfzAnalyticsDashboardApp({
  dashboard,
  filters,
}: {
  dashboard: KfzAnalyticsDashboard
  filters: KfzAnalyticsDashboardFilters
}) {
  const router = useRouter()

  return (
    <KfzAnalyticsDashboardView
      dashboard={dashboard}
      filters={filters}
      defaultPeriodId="7d"
      onFiltersChange={(next) => {
        router.push(buildKfzAnalyticsDashboardHref(next))
      }}
    />
  )
}
