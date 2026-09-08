import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import {
  buildKfzResponseDraftPreviewItem,
  KFZ_RESPONSE_DRAFT_PREVIEW_TASK_ID,
} from '@/features/inbox/lib/kfz-response-draft-preview'

export const metadata: Metadata = {
  title: 'Kfz Antwortentwurf (lokal)',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Local-only fixture of the Kfz inquiry draft workspace.
 * Production returns 404. Nothing is sent.
 */
export default async function KfzResponseDraftPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const item = buildKfzResponseDraftPreviewItem()
  const proposalResult = await getInboxAiProposal(item)

  return (
    <main className="min-h-screen bg-zinc-100 p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        Lokale Vorschau · interner Entwurf · kein Versand · keine Kundennachricht
      </p>
      <div className="mx-auto min-h-[80vh] max-w-6xl">
        <InboxWorkspace
          unprocessedItems={[item]}
          processedItems={[]}
          taskRelationsByItemId={{
            [item.id]: KFZ_RESPONSE_DRAFT_PREVIEW_TASK_ID,
          }}
          selectedItemId={item.id}
          aiProposal={proposalResult.proposal}
        />
      </div>
    </main>
  )
}
