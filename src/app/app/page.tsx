import { Suspense } from 'react'

import { WorkspaceFrame } from '@/components/app/workspace'
import { DashboardPageContent } from '@/features/dashboard/components/dashboard-page-content'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'

export default function AppDashboardPage() {
  return (
    <WorkspaceFrame hidePageHeader>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPageContent />
      </Suspense>
    </WorkspaceFrame>
  )
}
