import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  buildKfzWorkQueuePreviewItems,
  KFZ_WORK_QUEUE_PREVIEW_PATH,
} from '@/features/inbox/lib/kfz-work-queue-preview'
import { parseKfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'

export const metadata: Metadata = {
  title: 'Kfz Tagesliste (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type KfzWorkQueuePreviewPageProps = {
  searchParams: Promise<{ item?: string; phase?: string }>
}

/**
 * Local-only fixture of the daily Kfz inquiry queue.
 * Production returns 404. Nothing is sent.
 */
export default async function KfzWorkQueuePreviewPage({
  searchParams,
}: KfzWorkQueuePreviewPageProps) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { item, phase } = await searchParams
  const preview = buildKfzWorkQueuePreviewItems()
  const allItems = [...preview.unprocessedItems, ...preview.processedItems]
  const phaseFilter = parseKfzWorkQueueFilter(phase)
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
        Lokale Vorschau · Kfz-Tagesliste · kein Versand · keine Kundennachricht
      </p>
      <div className="mx-auto min-h-[80vh] max-w-6xl">
        <InboxWorkspace
          unprocessedItems={preview.unprocessedItems}
          processedItems={preview.processedItems}
          taskRelationsByItemId={preview.taskRelationsByItemId}
          selectedItemId={selectedItemId}
          phaseFilter={phaseFilter}
          hrefBasePath={KFZ_WORK_QUEUE_PREVIEW_PATH}
          aiProposal={aiProposal}
        />
      </div>
    </main>
  )
}
