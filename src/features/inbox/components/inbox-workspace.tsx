'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import { InboxDetailPanel } from '@/features/inbox/components/inbox-detail-panel'
import { InboxEmptyDetail } from '@/features/inbox/components/inbox-empty-detail'
import { InboxList } from '@/features/inbox/components/inbox-list'
import type { InboxItemView } from '@/features/inbox/lib/inbox-item-view'
import { parseInboxSearchQuery } from '@/features/inbox/lib/inbox-factual-search'
import {
  countInboxWorkQueue,
  formatInboxWorkQueueMeta,
  type InboxWorkQueueFilter,
} from '@/features/inbox/lib/inbox-factual-work-queue'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import {
  buildInboxHref,
  countKfzWorkQueue,
  formatKfzWorkQueueMeta,
  KFZ_INBOX_HREF_BASE,
  type KfzWorkQueueFilter,
} from '@/features/inbox/lib/kfz-work-queue'
import type { KfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
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
  queueFilter?: InboxWorkQueueFilter
  sourceFilter?: InboxSourceFilter
  searchQuery?: string
  itemView?: InboxItemView
  hrefBasePath?: string
  queueMeta?: string | null
  attachments?: InboxLinkedFile[]
  memberNameMap?: Record<string, string>
  aiProposal?: InboxAiProposal | null
  /** Authenticated inbox: obvious plain-text capture into the real intake path. */
  enableManualCapture?: boolean
  /** Local preview: persist confirmed items in memory instead of the server action. */
  onLocalConfirmed?: (item: InboxItem) => void
  /** Local fixtures may carry documented review times; live records never do. */
  allowLocalHistoryFixtureFacts?: boolean
  onLocalApply?: (itemId: string, command: KfzManualTriageCommand) => void
}

export function InboxWorkspace({
  unprocessedItems,
  processedItems,
  taskRelationsByItemId,
  selectedItemId,
  phaseFilter = 'all',
  queueFilter = 'all',
  sourceFilter = 'all',
  searchQuery = '',
  itemView = 'work',
  hrefBasePath = KFZ_INBOX_HREF_BASE,
  queueMeta = null,
  attachments = [],
  memberNameMap = {},
  aiProposal = null,
  enableManualCapture = false,
  onLocalConfirmed,
  allowLocalHistoryFixtureFacts = false,
  onLocalApply,
}: InboxWorkspaceProps) {
  const router = useRouter()
  const captureTriggerRef = useRef<HTMLButtonElement>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const committedSearch = parseInboxSearchQuery(searchQuery)
  const [searchDraft, setSearchDraft] = useState(searchQuery)
  const [prevCommittedSearch, setPrevCommittedSearch] = useState(committedSearch)
  if (committedSearch !== prevCommittedSearch) {
    setPrevCommittedSearch(committedSearch)
    if (parseInboxSearchQuery(searchDraft) !== committedSearch) {
      setSearchDraft(searchQuery)
    }
  }
  const searchWriteTimerRef = useRef<number | null>(null)
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

  const writeSearchToUrl = useCallback(
    (nextQuery: string, itemId: string | null = selectedItemId) => {
      const parsed = parseInboxSearchQuery(nextQuery)
      router.replace(
        buildInboxHref({
          itemId,
          phase: phaseFilter,
          queue: queueFilter,
          source: sourceFilter,
          q: parsed,
          view: itemView,
          basePath: hrefBasePath,
        }),
      )
    },
    [hrefBasePath, itemView, phaseFilter, queueFilter, router, selectedItemId, sourceFilter],
  )

  const handleSearchQueryChange = useCallback(
    (nextQuery: string) => {
      setSearchDraft(nextQuery)
      if (searchWriteTimerRef.current !== null) {
        window.clearTimeout(searchWriteTimerRef.current)
      }
      searchWriteTimerRef.current = window.setTimeout(() => {
        writeSearchToUrl(nextQuery)
      }, 250)
    },
    [writeSearchToUrl],
  )

  const handleClearSearch = useCallback(() => {
    if (searchWriteTimerRef.current !== null) {
      window.clearTimeout(searchWriteTimerRef.current)
      searchWriteTimerRef.current = null
    }
    setSearchDraft('')
    writeSearchToUrl('')
  }, [writeSearchToUrl])

  const navigateToItem = useCallback(
    (itemId: string) => {
      if (searchWriteTimerRef.current !== null) {
        window.clearTimeout(searchWriteTimerRef.current)
        searchWriteTimerRef.current = null
      }
      router.push(
        buildInboxHref({
          itemId,
          phase: phaseFilter,
          queue: queueFilter,
          source: sourceFilter,
          q: parseInboxSearchQuery(searchDraft),
          view: itemView,
          basePath: hrefBasePath,
        }),
      )
    },
    [hrefBasePath, itemView, phaseFilter, queueFilter, router, searchDraft, sourceFilter]
  )

  const navigateToList = useCallback(() => {
    router.push(
      buildInboxHref({
        phase: phaseFilter,
        queue: queueFilter,
        source: sourceFilter,
        q: parseInboxSearchQuery(searchDraft),
        basePath: hrefBasePath,
      }),
    )
  }, [hrefBasePath, phaseFilter, queueFilter, router, searchDraft, sourceFilter])

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
    if (onLocalApply) {
      return
    }
    refreshItems()
  }, [onLocalApply, refreshItems])

  const showMobileDetail = selectedItem !== null
  const totalCount = items.length
  const countLabel = totalCount === 1 ? '1 Element' : `${totalCount} Elemente`
  const derivedWorkQueueMeta = formatInboxWorkQueueMeta(
    countInboxWorkQueue(items, { taskRelationsByItemId }),
  )
  const derivedKfzMeta = formatKfzWorkQueueMeta(
    countKfzWorkQueue(items, taskRelationsByItemId),
  )
  const derivedMeta = [derivedWorkQueueMeta, derivedKfzMeta].filter(Boolean).join(' · ')
  const chromeMeta =
    queueMeta ?? (derivedMeta ? `${derivedMeta} · ${countLabel}` : countLabel)

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
              queueFilter={queueFilter}
              sourceFilter={sourceFilter}
              searchQuery={searchDraft}
              onSearchQueryChange={handleSearchQueryChange}
              onClearSearch={handleClearSearch}
              enableManualCapture={enableManualCapture}
              onOpenManualCapture={() => setCaptureOpen(true)}
              hrefBasePath={hrefBasePath}
              allowLocalFixtureFacts={allowLocalHistoryFixtureFacts}
            />
          )
        }
        detail={
          selectedItem ? (
            <InboxDetailPanel
              key={`${selectedItem.id}:${itemView}`}
              item={selectedItem}
              linkedTaskId={taskRelationsByItemId[selectedItem.id] ?? null}
              attachments={attachments}
              memberNameMap={memberNameMap}
              aiProposal={aiProposal}
              phaseFilter={phaseFilter}
              queueFilter={queueFilter}
              sourceFilter={sourceFilter}
              searchQuery={parseInboxSearchQuery(searchDraft)}
              itemView={itemView}
              hrefBasePath={hrefBasePath}
              allowLocalHistoryFixtureFacts={allowLocalHistoryFixtureFacts}
              onBack={handleBackToList}
              onDeleted={handleDeleted}
              onStatusChange={handleStatusChange}
              onLocalApply={
                onLocalApply
                  ? (command) => onLocalApply(selectedItem.id, command)
                  : undefined
              }
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
