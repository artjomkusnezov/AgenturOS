import { Suspense } from 'react'

import { DashboardPageContent } from '@/features/dashboard/components/dashboard-page-content'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'

export default function AppDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}
