import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InboxFactualWorkQueuePreviewApp } from '@/features/inbox/components/inbox-factual-work-queue-preview-app'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  buildUnifiedInboxPreviewItems,
  UNIFIED_INBOX_PREVIEW_PATH,
} from '@/features/inbox/lib/unified-inbox-preview'

export const metadata: Metadata = {
  title: 'Eingang (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type UnifiedInboxPreviewPageProps = {
  searchParams: Promise<{
    item?: string
    phase?: string
    queue?: string
    source?: string
    view?: string
  }>
}

/**
 * Local-only fixture of the unified daily inbox / factual work queue.
 * Production returns 404. Nothing is sent.
 */
export default async function UnifiedInboxPreviewPage({
  searchParams,
}: UnifiedInboxPreviewPageProps) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { item, phase, queue, source, view } = await searchParams
  buildUnifiedInboxPreviewItems()
  const selectedItemId = item && isValidInboxItemId(item) ? item : null

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · {UNIFIED_INBOX_PREVIEW_PATH} · faktische Arbeitsschlange · kein
        Versand · keine Kundennachricht
      </p>
      <div className="mx-auto min-h-[80vh] max-w-6xl">
        <InboxFactualWorkQueuePreviewApp
          selectedItemId={selectedItemId}
          phase={phase}
          queue={queue}
          source={source}
          view={view}
        />
      </div>
    </main>
  )
}
