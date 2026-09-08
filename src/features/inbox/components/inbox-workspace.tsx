'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import { InboxDetailPanel } from '@/features/inbox/components/inbox-detail-panel'
import { InboxEmptyDetail } from '@/features/inbox/components/inbox-empty-detail'
import { InboxList } from '@/features/inbox/components/inbox-list'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import {
  buildInboxHref,
  countKfzWorkQueue,
  formatKfzWorkQueueMeta,
  KFZ_INBOX_HREF_BASE,
  type KfzWorkQueueFilter,
} from '@/features/inbox/lib/kfz-work-queue'
import type { InboxItem, InboxLinkedFile } from '@/features/inbox/types/inbox-item'
import { ManualQuickCaptureDialog } from '@/features/inbound/manual/components/manual-quick-capture-dialog'
import { MANUAL_CAPTURE_ACTION_LABEL } from '@/features/inbound/manual/lib/manual-capture-copy'
import { aosBtnPrimaryClassName } from '@/lib/design-system'

type InboxWorkspaceProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  taskRelationsByItemId: Record<string, string>
  selectedItemId: string | null
  phaseFilter?: KfzWorkQueueFilter
  sourceFilter?: InboxSourceFilter
  hrefBasePath?: string
  queueMeta?: string | null
  attachments?: InboxLinkedFile[]
  memberNameMap?: Record<string, string>
  aiProposal?: InboxAiProposal | null
  /** Authenticated inbox: obvious plain-text capture into the real intake path. */
  enableManualCapture?: boolean
  /** Local preview: persist confirmed items in memory instead of the server action. */
  onLocalConfirmed?: (item: InboxItem) => void
}

export function InboxWorkspace({
  unprocessedItems,
  processedItems,
  taskRelationsByItemId,
  selectedItemId,
  phaseFilter = 'all',
  sourceFilter = 'all',
  hrefBasePath = KFZ_INBOX_HREF_BASE,
  queueMeta = null,
  attachments = [],
  memberNameMap = {},
  aiProposal = null,
  enableManualCapture = false,
  onLocalConfirmed,
}: InboxWorkspaceProps) {
  const router = useRouter()
  const captureTriggerRef = useRef<HTMLButtonElement>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const items = useMemo(
    () => [...unprocessedItems, ...processedItems],
    [unprocessedItems, processedItems]
  )

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )

  const refreshItems = useCallback(() => {
    router.refresh()
  }, [router])

  const navigateToItem = useCallback(
    (itemId: string) => {
      router.push(
        buildInboxHref({
          itemId,
          phase: phaseFilter,
          source: sourceFilter,
          basePath: hrefBasePath,
        }),
      )
    },
    [hrefBasePath, phaseFilter, router, sourceFilter]
  )

  const navigateToList = useCallback(() => {
    router.push(
      buildInboxHref({
        phase: phaseFilter,
        source: sourceFilter,
        basePath: hrefBasePath,
      }),
    )
  }, [hrefBasePath, phaseFilter, router, sourceFilter])

  const handleSelectItem = useCallback(
    (itemId: string) => {
      navigateToItem(itemId)
    },
    [navigateToItem]
  )

  const handleBackToList = useCallback(() => {
    navigateToList()
  }, [navigateToList])

  const handleDeleted = useCallback(() => {
    navigateToList()
    refreshItems()
  }, [navigateToList, refreshItems])

  const handleStatusChange = useCallback(() => {
    refreshItems()
  }, [refreshItems])

  const showMobileDetail = selectedItem !== null
  const totalCount = items.length
  const countLabel = totalCount === 1 ? '1 Element' : `${totalCount} Elemente`
  const derivedKfzMeta = formatKfzWorkQueueMeta(
    countKfzWorkQueue(items, taskRelationsByItemId),
  )
  const chromeMeta =
    queueMeta ?? (derivedKfzMeta ? `${derivedKfzMeta} · ${countLabel}` : countLabel)

  return (
    <WorkspaceFrame
      compact
      meta={chromeMeta}
      primary={
        enableManualCapture ? (
          <button
            ref={captureTriggerRef}
            type="button"
            onClick={() => setCaptureOpen(true)}
            className={`${aosBtnPrimaryClassName} min-h-11`}
          >
            {MANUAL_CAPTURE_ACTION_LABEL}
          </button>
        ) : null
      }
    >
      <WorkspaceSplit
        listLabel="Eingangsliste"
        detailLabel="Eingangsdetails"
        showMobileDetail={showMobileDetail}
        list={
          totalCount === 0 ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <EmptyState
                title="Noch nichts erfasst"
                description="Text einfügen oder tippen, den Entwurf prüfen und erst dann im Eingang anlegen."
              />
              {enableManualCapture ? (
                <button
                  type="button"
                  onClick={() => setCaptureOpen(true)}
                  className={`${aosBtnPrimaryClassName} min-h-11`}
                >
                  {MANUAL_CAPTURE_ACTION_LABEL}
                </button>
              ) : null}
            </div>
          ) : (
            <InboxList
              unprocessedItems={unprocessedItems}
              processedItems={processedItems}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
              memberNameMap={memberNameMap}
              taskRelationsByItemId={taskRelationsByItemId}
              phaseFilter={phaseFilter}
              sourceFilter={sourceFilter}
              hrefBasePath={hrefBasePath}
            />
          )
        }
        detail={
          selectedItem ? (
            <InboxDetailPanel
              key={selectedItem.id}
              item={selectedItem}
              linkedTaskId={taskRelationsByItemId[selectedItem.id] ?? null}
              attachments={attachments}
              memberNameMap={memberNameMap}
              aiProposal={aiProposal}
              onBack={handleBackToList}
              onDeleted={handleDeleted}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <InboxEmptyDetail />
          )
        }
      />
      {enableManualCapture ? (
        <ManualQuickCaptureDialog
          isOpen={captureOpen}
          onClose={() => setCaptureOpen(false)}
          triggerRef={captureTriggerRef}
          existingItems={items}
          onLocalConfirmed={onLocalConfirmed}
          reviewHrefBase={hrefBasePath}
        />
      ) : null}
    </WorkspaceFrame>
  )
}
