import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { parseInboxItemView } from '@/features/inbox/lib/inbox-item-view'
import { parseInboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  buildUnifiedInboxPreviewItems,
  UNIFIED_INBOX_PREVIEW_PATH,
} from '@/features/inbox/lib/unified-inbox-preview'
import { parseKfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'

export const metadata: Metadata = {
  title: 'Eingang (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type UnifiedInboxPreviewPageProps = {
  searchParams: Promise<{ item?: string; phase?: string; source?: string; view?: string }>
}

/**
 * Local-only fixture of the unified daily inbox.
 * Production returns 404. Nothing is sent.
 */
export default async function UnifiedInboxPreviewPage({
  searchParams,
}: UnifiedInboxPreviewPageProps) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { item, phase, source, view } = await searchParams
  const preview = buildUnifiedInboxPreviewItems()
  const allItems = [...preview.unprocessedItems, ...preview.processedItems]
  const phaseFilter = parseKfzWorkQueueFilter(phase)
  const sourceFilter = parseInboxSourceFilter(source)
  const itemView = parseInboxItemView(view)
  const selectedItemId =
    item && isValidInboxItemId(item) && allItems.some((entry) => entry.id === item)
      ? item
      : null

  let aiProposal: InboxAiProposal | null = null
  if (selectedItemId) {
    const selectedItem = allItems.find((entry) => entry.id === selectedItemId) ?? null
    if (selectedItem) {
      const proposalResult = await getInboxAiProposal(selectedItem)
      aiProposal = proposalResult.proposal
    }
  }

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · einheitlicher Eingang · kein Versand · keine Kundennachricht
      </p>
      <div className="mx-auto min-h-[80vh] max-w-6xl">
        <InboxWorkspace
          unprocessedItems={preview.unprocessedItems}
          processedItems={preview.processedItems}
          taskRelationsByItemId={preview.taskRelationsByItemId}
          selectedItemId={selectedItemId}
          phaseFilter={phaseFilter}
          sourceFilter={sourceFilter}
          itemView={itemView}
          hrefBasePath={UNIFIED_INBOX_PREVIEW_PATH}
          enableManualCapture
          allowLocalHistoryFixtureFacts
          aiProposal={aiProposal}
        />
      </div>
    </main>
  )
}
