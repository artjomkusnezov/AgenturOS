'use client'

import { useMemo, useState } from 'react'

import { InboxKfzPhaseFilter } from '@/features/inbox/components/inbox-kfz-phase-filter'
import { InboxListItem } from '@/features/inbox/components/inbox-list-item'
import { InboxSourceFilterNav } from '@/features/inbox/components/inbox-source-filter'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import {
  buildInboxSourceFilterHrefs,
  countInboxSourceFilters,
  filterInboxItemsBySource,
  INBOX_SOURCE_FILTER_LABELS,
  type InboxSourceFilter,
} from '@/features/inbox/lib/inbox-source-filter'
import {
  countKfzWorkQueue,
  filterInboxItemsByKfzPhase,
  KFZ_WORK_QUEUE_FILTER_LABELS,
  resolveInboxLinkedTaskId,
  resolveKfzWorkQueuePhase,
  type KfzWorkQueueFilter,
} from '@/features/inbox/lib/kfz-work-queue'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { aosListGroupLabelClassName } from '@/lib/design-system'

const ARCHIVED_PREVIEW_LIMIT = 5

type InboxListProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
  memberNameMap?: Record<string, string>
  taskRelationsByItemId?: Record<string, string>
  phaseFilter?: KfzWorkQueueFilter
  sourceFilter?: InboxSourceFilter
  hrefBasePath?: string | null
}

export function InboxList({
  unprocessedItems,
  processedItems,
  selectedItemId,
  onSelectItem,
  memberNameMap = {},
  taskRelationsByItemId = {},
  phaseFilter = 'all',
  sourceFilter = 'all',
  hrefBasePath = null,
}: InboxListProps) {
  const [archiveExpanded, setArchiveExpanded] = useState(false)
  const allItems = useMemo(
    () => [...unprocessedItems, ...processedItems],
    [unprocessedItems, processedItems],
  )
  const kfzCounts = useMemo(
    () => countKfzWorkQueue(allItems, taskRelationsByItemId),
    [allItems, taskRelationsByItemId],
  )
  const sourceCounts = useMemo(() => countInboxSourceFilters(allItems), [allItems])
  const sourceFilterHrefs = useMemo(
    () =>
      buildInboxSourceFilterHrefs({
        selectedItemId,
        selectedItem: allItems.find((item) => item.id === selectedItemId) ?? null,
        phase: phaseFilter,
        basePath: hrefBasePath,
      }),
    [allItems, hrefBasePath, phaseFilter, selectedItemId],
  )
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null
  const selectedPhase = selectedItem
    ? resolveKfzWorkQueuePhase(
        selectedItem,
        resolveInboxLinkedTaskId(selectedItem.id, taskRelationsByItemId),
      )
    : null
  const visibleUnprocessedItems = useMemo(
    () =>
      filterInboxItemsByKfzPhase(
        filterInboxItemsBySource(unprocessedItems, sourceFilter),
        phaseFilter,
        taskRelationsByItemId,
      ),
    [phaseFilter, sourceFilter, taskRelationsByItemId, unprocessedItems],
  )
  const filteredProcessedItems = useMemo(
    () =>
      filterInboxItemsByKfzPhase(
        filterInboxItemsBySource(processedItems, sourceFilter),
        phaseFilter,
        taskRelationsByItemId,
      ),
    [phaseFilter, processedItems, sourceFilter, taskRelationsByItemId],
  )

  const visibleProcessedItems = useMemo(() => {
    if (archiveExpanded || filteredProcessedItems.length <= ARCHIVED_PREVIEW_LIMIT) {
      return filteredProcessedItems
    }

    return filteredProcessedItems.slice(0, ARCHIVED_PREVIEW_LIMIT)
  }, [archiveExpanded, filteredProcessedItems])

  const canToggleArchive = filteredProcessedItems.length > ARCHIVED_PREVIEW_LIMIT
  const queueMode = phaseFilter !== 'all'
  const queueItems = [...visibleUnprocessedItems, ...filteredProcessedItems]
  const filterEmpty = queueItems.length === 0

  return (
    <div className="space-y-3">
      <InboxSourceFilterNav
        activeSource={sourceFilter}
        counts={sourceCounts}
        hrefs={sourceFilterHrefs}
      />
      <InboxKfzPhaseFilter
        activePhase={phaseFilter}
        counts={kfzCounts}
        selectedItemId={selectedItemId}
        selectedPhase={selectedPhase}
        sourceFilter={sourceFilter}
        hrefBasePath={hrefBasePath}
      />

      {filterEmpty ? (
        <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">
          {sourceFilter !== 'all' || queueMode
            ? 'Keine Einträge für diesen Filter.'
            : 'Keine Kfz-Anfragen in dieser Tagesliste.'}
        </p>
      ) : queueMode ? (
        <div>
          <h3 className={aosListGroupLabelClassName}>
            {sourceFilter !== 'all'
              ? `${INBOX_SOURCE_FILTER_LABELS[sourceFilter]} · ${KFZ_WORK_QUEUE_FILTER_LABELS[phaseFilter]}`
              : KFZ_WORK_QUEUE_FILTER_LABELS[phaseFilter]}
          </h3>
          <ul className="flex flex-col">
            {queueItems.map((item) => (
              <li key={item.id}>
                <InboxListItem
                  item={item}
                  isSelected={item.id === selectedItemId}
                  subdued={!isInboxItemUnprocessed(item)}
                  linkedTaskId={resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)}
                  onSelect={onSelectItem}
                  memberNameMap={memberNameMap}
                  phaseFilter={phaseFilter}
                  sourceFilter={sourceFilter}
                  hrefBasePath={hrefBasePath}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div>
            <h3 className={aosListGroupLabelClassName}>Unbearbeitet</h3>
            {visibleUnprocessedItems.length === 0 ? (
              <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">Keine unbearbeiteten Elemente.</p>
            ) : (
              <ul className="flex flex-col">
                {visibleUnprocessedItems.map((item) => (
                  <li key={item.id}>
                    <InboxListItem
                      item={item}
                      isSelected={item.id === selectedItemId}
                      linkedTaskId={resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)}
                      onSelect={onSelectItem}
                      memberNameMap={memberNameMap}
                      phaseFilter={phaseFilter}
                      sourceFilter={sourceFilter}
                      hrefBasePath={hrefBasePath}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {filteredProcessedItems.length > 0 ? (
            <div className="border-t border-zinc-200/40 pt-2.5">
              <h3 className={aosListGroupLabelClassName}>Bearbeitet</h3>
              <ul className="flex flex-col">
                {visibleProcessedItems.map((item) => (
                  <li key={item.id}>
                    <InboxListItem
                      item={item}
                      isSelected={item.id === selectedItemId}
                      subdued
                      linkedTaskId={resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)}
                      onSelect={onSelectItem}
                      memberNameMap={memberNameMap}
                      phaseFilter={phaseFilter}
                      sourceFilter={sourceFilter}
                      hrefBasePath={hrefBasePath}
                    />
                  </li>
                ))}
              </ul>
              {canToggleArchive ? (
                <button
                  type="button"
                  className="aos-ws-archive-toggle"
                  onClick={() => setArchiveExpanded((open) => !open)}
                  aria-expanded={archiveExpanded}
                >
                  {archiveExpanded ? 'Archiv einklappen' : 'Alle bearbeiteten anzeigen'}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
