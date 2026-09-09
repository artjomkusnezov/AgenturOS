'use client'

import { useRouter } from 'next/navigation'

import { KfzAnalyticsDashboardView } from '@/features/inbound/kfz/components/kfz-analytics-dashboard'
import type {
  KfzAnalyticsDashboard,
  KfzAnalyticsPeriodId,
} from '@/features/inbound/kfz/types/kfz-analytics'

export function KfzAnalyticsDashboardApp({
  dashboard,
  periodId,
}: {
  dashboard: KfzAnalyticsDashboard
  periodId: KfzAnalyticsPeriodId
}) {
  const router = useRouter()

  return (
    <KfzAnalyticsDashboardView
      dashboard={dashboard}
      periodId={periodId}
      onPeriodChange={(next) => {
        router.push(`/app/kfz-analytics?period=${next}`)
      }}
    />
  )
}
