'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { parseInboxSearchQuery } from '@/features/inbox/lib/inbox-factual-search'
import { parseInboxWorkQueueFilter } from '@/features/inbox/lib/inbox-factual-work-queue'
import { parseInboxItemView } from '@/features/inbox/lib/inbox-item-view'
import { parseInboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import { applyInboxDuplicateDecisionToItems } from '@/features/inbox/lib/inbox-exact-duplicate-review'
import { applyKfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { parseKfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'
import { buildKfzWorkQueuePreviewItems } from '@/features/inbox/lib/kfz-work-queue-preview'
import {
  splitUnifiedInboxPreviewItems,
  UNIFIED_INBOX_PREVIEW_PATH,
} from '@/features/inbox/lib/unified-inbox-preview'
import {
  readUnifiedInboxPreviewItems,
  readUnifiedInboxPreviewServerSnapshot,
  subscribeUnifiedInboxPreview,
  writeUnifiedInboxPreviewItems,
} from '@/features/inbox/lib/unified-inbox-preview-store'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type InboxFactualWorkQueuePreviewAppProps = {
  selectedItemId: string | null
  phase?: string | null
  queue?: string | null
  source?: string | null
  q?: string | null
  view?: string | null
}

export function InboxFactualWorkQueuePreviewApp({
  selectedItemId,
  phase,
  queue,
  source,
  q,
  view,
}: InboxFactualWorkQueuePreviewAppProps) {
  const items = useSyncExternalStore(
    subscribeUnifiedInboxPreview,
    readUnifiedInboxPreviewItems,
    readUnifiedInboxPreviewServerSnapshot,
  )
  const split = useMemo(() => splitUnifiedInboxPreviewItems(items), [items])
  const phaseFilter = parseKfzWorkQueueFilter(phase)
  const queueFilter = parseInboxWorkQueueFilter(queue)
  const sourceFilter = parseInboxSourceFilter(source)
  const searchQuery = parseInboxSearchQuery(q)
  const itemView = parseInboxItemView(view)
  const taskRelationsByItemId = useMemo(
    () => buildKfzWorkQueuePreviewItems().taskRelationsByItemId,
    [],
  )

  return (
    <InboxWorkspace
      unprocessedItems={split.unprocessedItems}
      processedItems={split.processedItems}
      taskRelationsByItemId={taskRelationsByItemId}
      selectedItemId={selectedItemId}
      phaseFilter={phaseFilter}
      queueFilter={queueFilter}
      sourceFilter={sourceFilter}
      searchQuery={searchQuery}
      itemView={itemView}
      hrefBasePath={UNIFIED_INBOX_PREVIEW_PATH}
      enableManualCapture
      allowLocalHistoryFixtureFacts
      onLocalConfirmed={(item: InboxItem) => {
        writeUnifiedInboxPreviewItems([item, ...items])
      }}
      onLocalApply={(itemId, command) => {
        const current = items.find((item) => item.id === itemId)
        if (!current) {
          return
        }
        const applied = applyKfzManualTriageCommand(
          {
            content: current.content,
            processed_at: current.processed_at,
            linkedTaskId: taskRelationsByItemId[itemId] ?? null,
          },
          command,
        )
        if (!applied.ok) {
          return
        }
        writeUnifiedInboxPreviewItems(
          items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  content: applied.next.content,
                  processed_at: applied.next.processed_at,
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        )
      }}
      onLocalDuplicateApply={(itemId, command) => {
        const applied = applyInboxDuplicateDecisionToItems(items, itemId, command)
        if (!applied.ok) {
          return
        }
        writeUnifiedInboxPreviewItems(applied.items)
      }}
    />
  )
}
