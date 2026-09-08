'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import { MANUAL_CAPTURE_NO_AUTO_ACTION } from '@/features/inbound/manual/lib/manual-capture-copy'
import {
  buildManualCapturePreviewSeedItems,
  MANUAL_CAPTURE_PREVIEW_PATH,
} from '@/features/inbound/manual/lib/manual-capture-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

/**
 * Local-only interactive capture → draft review → inbox workspace.
 * Production returns 404 from the page. Nothing is sent.
 */
export function ManualCapturePreviewApp() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<InboxItem[]>(() => buildManualCapturePreviewSeedItems())

  const selectedItemId = useMemo(() => {
    const requested = searchParams.get('item')
    if (requested && isValidInboxItemId(requested) && items.some((item) => item.id === requested)) {
      return requested
    }

    return items[0]?.id ?? null
  }, [items, searchParams])

  const handleLocalConfirmed = useCallback((created: InboxItem) => {
    setItems((current) => [created, ...current.filter((item) => item.id !== created.id)])
  }, [])

  const unprocessedItems = items.filter((item) => item.processed_at === null)
  const processedItems = items.filter((item) => item.processed_at !== null)

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · manuelle Texterfassung · {MANUAL_CAPTURE_NO_AUTO_ACTION}
      </p>
      <div className="mx-auto min-h-[80vh] max-w-6xl">
        <InboxWorkspace
          unprocessedItems={unprocessedItems}
          processedItems={processedItems}
          taskRelationsByItemId={{}}
          selectedItemId={selectedItemId}
          hrefBasePath={MANUAL_CAPTURE_PREVIEW_PATH}
          enableManualCapture
          onLocalConfirmed={handleLocalConfirmed}
        />
      </div>
    </main>
  )
}
