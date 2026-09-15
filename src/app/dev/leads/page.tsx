import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import { LeadsPreviewApp } from '@/features/leads/components/leads-preview-app'
import { LeadsPreviewChrome } from '@/features/leads/components/leads-preview-chrome'

export const metadata: Metadata = {
  title: 'Leads (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type LeadsPreviewPageProps = {
  searchParams: Promise<{
    item?: string
    status?: string
  }>
}

/**
 * Local-only employee chrome for Kfz leads.
 * Production returns 404. Nothing is sent.
 */
export default async function LeadsPreviewPage({ searchParams }: LeadsPreviewPageProps) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { item, status } = await searchParams
  const selectedItemId = item && isValidInboxItemId(item) ? item : null

  return (
    <LeadsPreviewChrome>
      <LeadsPreviewApp selectedItemId={selectedItemId} status={status} />
    </LeadsPreviewChrome>
  )
}
