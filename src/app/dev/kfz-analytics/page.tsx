import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { KfzAnalyticsPreviewApp } from '@/features/inbound/kfz/components/kfz-analytics-preview-app'
import { getKfzAnalyticsPreviewStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'

export const metadata: Metadata = {
  title: 'Kfz-Messung (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Local-only analytics dashboard. Production returns 404.
 */
export default async function KfzAnalyticsPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const events = await getKfzAnalyticsPreviewStore().listEvents()

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · /dev/kfz-analytics · first-party Messung · kein Pixel
      </p>
      <div className="mx-auto max-w-6xl">
        <KfzAnalyticsPreviewApp initialEvents={events} />
      </div>
    </main>
  )
}
