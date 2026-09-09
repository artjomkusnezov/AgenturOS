'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { parseInboxItemView } from '@/features/inbox/lib/inbox-item-view'
import { applyKfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  buildKfzReplyHandoffPreviewItems,
  KFZ_REPLY_HANDOFF_PREVIEW_PATH,
  KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY,
  listKfzReplyHandoffPreviewItems,
  splitKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview'
import { parseInboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import { parseKfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type InboxKfzReplyHandoffPreviewAppProps = {
  selectedItemId: string | null
  phase?: string | null
  source?: string | null
  view?: string | null
}

function seedItems(): InboxItem[] {
  const seeded = buildKfzReplyHandoffPreviewItems()
  return listKfzReplyHandoffPreviewItems(seeded)
}

function readPersistedItems(): InboxItem[] {
  if (typeof window === 'undefined') {
    return seedItems()
  }

  try {
    const raw = window.sessionStorage.getItem(KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY)
    if (!raw) {
      return seedItems()
    }
    const parsed = JSON.parse(raw) as InboxItem[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedItems()
    }
    return parsed
  } catch {
    return seedItems()
  }
}

export function InboxKfzReplyHandoffPreviewApp({
  selectedItemId,
  phase,
  source,
  view,
}: InboxKfzReplyHandoffPreviewAppProps) {
  const [items, setItems] = useState<InboxItem[]>(seedItems)
  const split = useMemo(() => splitKfzReplyHandoffPreviewItems(items), [items])

  useEffect(() => {
    setItems(readPersistedItems())
  }, [])
  const phaseFilter = parseKfzWorkQueueFilter(phase)
  const sourceFilter = parseInboxSourceFilter(source)
  const itemView = parseInboxItemView(view)

  const persist = useCallback((next: InboxItem[]) => {
    setItems(next)
    window.sessionStorage.setItem(
      KFZ_REPLY_HANDOFF_PREVIEW_STORAGE_KEY,
      JSON.stringify(next),
    )
  }, [])

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
        persist(
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
