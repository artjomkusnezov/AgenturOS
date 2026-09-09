import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InboxKfzReplyHandoffPreviewApp } from '@/features/inbox/components/inbox-kfz-reply-handoff-preview-app'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  buildKfzReplyHandoffPreviewItems,
  listKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview'

export const metadata: Metadata = {
  title: 'Kfz Antwortübergabe (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type KfzReplyHandoffPreviewPageProps = {
  searchParams: Promise<{ item?: string; phase?: string; source?: string; view?: string }>
}

/**
 * Local-only fixture of the preferred-channel reply handoff.
 * Production returns 404. Nothing is sent.
 */
export default async function KfzReplyHandoffPreviewPage({
  searchParams,
}: KfzReplyHandoffPreviewPageProps) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { item, phase, source, view } = await searchParams
  const preview = buildKfzReplyHandoffPreviewItems()
  const allItems = listKfzReplyHandoffPreviewItems(preview)
  const selectedItemId =
    item && isValidInboxItemId(item) && allItems.some((entry) => entry.id === item)
      ? item
      : null

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · manuelle Antwortübergabe · kein Versand · keine Kundennachricht
      </p>
      <div className="mx-auto min-h-[80vh] max-w-6xl">
        <InboxKfzReplyHandoffPreviewApp
          selectedItemId={selectedItemId}
          phase={phase}
          source={source}
          view={view}
        />
      </div>
    </main>
  )
}
