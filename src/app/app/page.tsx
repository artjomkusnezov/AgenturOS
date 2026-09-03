import { Suspense } from 'react'

import { WorkspaceFrame } from '@/components/app/workspace'
import { AgenturzentraleShell } from '@/features/dashboard/components/agenturzentrale-shell'
import { DashboardPageContent } from '@/features/dashboard/components/dashboard-page-content'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'

export default function AppDashboardPage() {
  return (
    <AgenturzentraleShell>
      <WorkspaceFrame hidePageHeader>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardPageContent />
        </Suspense>
      </WorkspaceFrame>
    </AgenturzentraleShell>
  )
}
