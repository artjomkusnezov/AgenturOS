import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { KfzLandingPreviewApp } from '@/features/inbound/kfz/components/kfz-landing-preview-app'
import { KfzLandingShell } from '@/features/inbound/kfz/components/kfz-landing-shell'

export const metadata: Metadata = {
  title: 'Kfz-Landing Submit (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Local-only landing submit seam. Production returns 404. Nothing is sent.
 */
export default function KfzLandingPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <KfzLandingShell>
      <KfzLandingPreviewApp />
    </KfzLandingShell>
  )
}
