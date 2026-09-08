import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ManualCapturePreviewApp } from '@/features/inbound/manual/components/manual-capture-preview-app'

export const metadata: Metadata = {
  title: 'Texterfassung (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Local-only manual text capture → draft review → inbox workspace.
 * Production returns 404. Nothing is sent.
 */
export default function ManualCapturePreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <ManualCapturePreviewApp />
}
