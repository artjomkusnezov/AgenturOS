import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { WorkspaceFrame } from '@/components/app/workspace'
import { LeadsDashboardPreviewApp } from '@/features/leads/components/leads-dashboard-preview-app'
import { LeadsPreviewChrome } from '@/features/leads/components/leads-preview-chrome'
import { aosDashboardZentraleClassName } from '@/lib/design-system'

export const metadata: Metadata = {
  title: 'Übersicht (lokal, Leads)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Local-only dashboard surface to prove Offene Leads KPI + navigation.
 * Production returns 404. Nothing is sent.
 */
export default async function LeadsDashboardPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <LeadsPreviewChrome>
      <WorkspaceFrame hidePageHeader className={aosDashboardZentraleClassName}>
        <LeadsDashboardPreviewApp />
      </WorkspaceFrame>
    </LeadsPreviewChrome>
  )
}
