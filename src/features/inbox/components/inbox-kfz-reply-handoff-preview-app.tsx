'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { parseInboxItemView } from '@/features/inbox/lib/inbox-item-view'
import { applyKfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  KFZ_REPLY_HANDOFF_PREVIEW_PATH,
  splitKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview'
import {
  readKfzReplyHandoffPreviewItems,
  readKfzReplyHandoffPreviewServerSnapshot,
  subscribeKfzReplyHandoffPreview,
  writeKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview-store'
import { parseInboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import { parseKfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'

type InboxKfzReplyHandoffPreviewAppProps = {
  selectedItemId: string | null
  phase?: string | null
  source?: string | null
  view?: string | null
}

export function InboxKfzReplyHandoffPreviewApp({
  selectedItemId,
  phase,
  source,
  view,
}: InboxKfzReplyHandoffPreviewAppProps) {
  const items = useSyncExternalStore(
    subscribeKfzReplyHandoffPreview,
    readKfzReplyHandoffPreviewItems,
    readKfzReplyHandoffPreviewServerSnapshot,
  )
  const split = useMemo(() => splitKfzReplyHandoffPreviewItems(items), [items])
  const phaseFilter = parseKfzWorkQueueFilter(phase)
  const sourceFilter = parseInboxSourceFilter(source)
  const itemView = parseInboxItemView(view)

  return (
    <InboxWorkspace
      unprocessedItems={split.unprocessedItems}
      processedItems={split.processedItems}
      taskRelationsByItemId={{}}
      selectedItemId={selectedItemId}
      phaseFilter={phaseFilter}
      sourceFilter={sourceFilter}
      itemView={itemView}
      hrefBasePath={KFZ_REPLY_HANDOFF_PREVIEW_PATH}
      allowLocalHistoryFixtureFacts
      onLocalApply={(itemId, command) => {
        const current = items.find((item) => item.id === itemId)
        if (!current) {
          return
        }
        const applied = applyKfzManualTriageCommand(
          {
            content: current.content,
            processed_at: current.processed_at,
            linkedTaskId: null,
          },
          command,
        )
        if (!applied.ok) {
          return
        }
        writeKfzReplyHandoffPreviewItems(
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
    />
  )
}
