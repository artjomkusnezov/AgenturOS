import { Suspense } from 'react'

import { DashboardPageContent } from '@/features/dashboard/components/dashboard-page-content'
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton'

/** Auth + live operational data — never statically prerender. */
export const dynamic = 'force-dynamic'

export default function AppDashboardPage() {
  return (
    <div className="agenturzentrale-root min-h-full bg-[var(--az-bg-deep,#0a0c10)]">
      <div className="mx-auto w-full max-w-[90rem] px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardPageContent />
        </Suspense>
      </div>
    </div>
  )
}

