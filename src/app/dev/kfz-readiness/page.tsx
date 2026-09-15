import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { evaluateKfzLaunchReadiness } from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KfzLaunchReadinessView } from '@/features/inbound/kfz/components/kfz-launch-readiness-view'

export const metadata: Metadata = {
  title: 'Kfz-Startcheck (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Local-only readiness checklist. Production returns 404.
 * Same evaluation as /app/kfz-readiness. No secrets, no production claim.
 */
export default function KfzLaunchReadinessPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const report = evaluateKfzLaunchReadiness()

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · /dev/kfz-readiness · interner Startcheck · keine Produktionsfreigabe
      </p>
      <div className="aos-workspace-page mx-auto max-w-3xl">
        <KfzLaunchReadinessView report={report} />
      </div>
    </main>
  )
}
