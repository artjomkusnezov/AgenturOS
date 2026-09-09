'use client'

import { useMemo } from 'react'

import { InboxKfzPhaseFilter } from '@/features/inbox/components/inbox-kfz-phase-filter'
import { InboxListItem } from '@/features/inbox/components/inbox-list-item'
import { InboxSourceFilterNav } from '@/features/inbox/components/inbox-source-filter'
import { InboxWorkQueueFilterNav } from '@/features/inbox/components/inbox-work-queue-filter'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import {
  buildInboxSourceFilterHrefs,
  countInboxSourceFilters,
  filterInboxItemsBySource,
  INBOX_SOURCE_FILTER_LABELS,
  type InboxSourceFilter,
} from '@/features/inbox/lib/inbox-source-filter'
import {
  buildInboxWorkQueueFilterHrefs,
  countInboxWorkQueue,
  filterInboxItemsByWorkQueue,
  groupInboxWorkQueueItems,
  INBOX_WORK_QUEUE_FILTER_LABELS,
  INBOX_WORK_QUEUE_SORT_NOTE,
  sortInboxWorkQueueItems,
  type InboxWorkQueueFilter,
} from '@/features/inbox/lib/inbox-factual-work-queue'
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

type InboxListProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
  memberNameMap?: Record<string, string>
  taskRelationsByItemId?: Record<string, string>
  phaseFilter?: KfzWorkQueueFilter
  queueFilter?: InboxWorkQueueFilter
  sourceFilter?: InboxSourceFilter
  hrefBasePath?: string | null
  allowLocalFixtureFacts?: boolean
}

export function InboxList({
  unprocessedItems,
  processedItems,
  selectedItemId,
  onSelectItem,
  memberNameMap = {},
  taskRelationsByItemId = {},
  phaseFilter = 'all',
  queueFilter = 'all',
  sourceFilter = 'all',
  hrefBasePath = null,
  allowLocalFixtureFacts = false,
}: InboxListProps) {
  const allItems = useMemo(
    () => [...unprocessedItems, ...processedItems],
    [unprocessedItems, processedItems],
  )
  const kfzCounts = useMemo(
    () => countKfzWorkQueue(allItems, taskRelationsByItemId),
    [allItems, taskRelationsByItemId],
  )
  const workQueueCounts = useMemo(
    () => countInboxWorkQueue(allItems, { taskRelationsByItemId }),
    [allItems, taskRelationsByItemId],
  )
  const sourceCounts = useMemo(() => countInboxSourceFilters(allItems), [allItems])
  const sourceFilterHrefs = useMemo(
    () =>
      buildInboxSourceFilterHrefs({
        selectedItemId,
        selectedItem: allItems.find((item) => item.id === selectedItemId) ?? null,
        phase: phaseFilter,
        queue: queueFilter,
        basePath: hrefBasePath,
      }),
    [allItems, hrefBasePath, phaseFilter, queueFilter, selectedItemId],
  )
  const workQueueFilterHrefs = useMemo(
    () =>
      buildInboxWorkQueueFilterHrefs({
        selectedItemId,
        selectedItem: allItems.find((item) => item.id === selectedItemId) ?? null,
        linkedTaskId: selectedItemId
          ? resolveInboxLinkedTaskId(selectedItemId, taskRelationsByItemId)
          : null,
        phase: phaseFilter,
        source: sourceFilter,
        basePath: hrefBasePath,
      }),
    [allItems, hrefBasePath, phaseFilter, selectedItemId, sourceFilter, taskRelationsByItemId],
  )
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null
  const selectedPhase = selectedItem
    ? resolveKfzWorkQueuePhase(
        selectedItem,
        resolveInboxLinkedTaskId(selectedItem.id, taskRelationsByItemId),
      )
    : null
  const visibleItems = useMemo(
    () =>
      sortInboxWorkQueueItems(
        filterInboxItemsByWorkQueue(
          filterInboxItemsByKfzPhase(
            filterInboxItemsBySource(allItems, sourceFilter),
            phaseFilter,
            taskRelationsByItemId,
          ),
          queueFilter,
          { taskRelationsByItemId },
        ),
      ),
    [allItems, phaseFilter, queueFilter, sourceFilter, taskRelationsByItemId],
  )
  const timeGroups = useMemo(() => groupInboxWorkQueueItems(visibleItems), [visibleItems])
  const filterEmpty = visibleItems.length === 0
  const queueMode = phaseFilter !== 'all' || queueFilter !== 'all'
  const headingParts = [
    sourceFilter !== 'all' ? INBOX_SOURCE_FILTER_LABELS[sourceFilter] : null,
    queueFilter !== 'all' ? INBOX_WORK_QUEUE_FILTER_LABELS[queueFilter] : null,
    phaseFilter !== 'all' ? KFZ_WORK_QUEUE_FILTER_LABELS[phaseFilter] : null,
  ].filter(Boolean)

  return (
    <div className="space-y-3">
      <InboxSourceFilterNav
        activeSource={sourceFilter}
        counts={sourceCounts}
        hrefs={sourceFilterHrefs}
      />
      <InboxWorkQueueFilterNav
        activeQueue={queueFilter}
        counts={workQueueCounts}
        totalCount={allItems.length}
        hrefs={workQueueFilterHrefs}
      />
      <InboxKfzPhaseFilter
        activePhase={phaseFilter}
        counts={kfzCounts}
        selectedItemId={selectedItemId}
        selectedPhase={selectedPhase}
        sourceFilter={sourceFilter}
        queueFilter={queueFilter}
        hrefBasePath={hrefBasePath}
      />

      {filterEmpty ? (
        <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">
          {sourceFilter !== 'all' || queueMode
            ? 'Keine Einträge für diesen Filter.'
            : 'Keine Eingänge in dieser Arbeitsschlange.'}
        </p>
      ) : (
        <div>
          {headingParts.length > 0 ? (
            <h3 className={aosListGroupLabelClassName}>{headingParts.join(' · ')}</h3>
          ) : (
            <p className="aos-ws-text-muted px-2 py-1 text-[10px] leading-snug">
              {INBOX_WORK_QUEUE_SORT_NOTE}
            </p>
          )}
          {timeGroups.map((group) => (
            <div key={group.group}>
              <h3 className={aosListGroupLabelClassName}>{group.label}</h3>
              <ul className="flex flex-col">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <InboxListItem
                      item={item}
                      isSelected={item.id === selectedItemId}
                      subdued={!isInboxItemUnprocessed(item)}
                      linkedTaskId={resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)}
                      onSelect={onSelectItem}
                      memberNameMap={memberNameMap}
                      phaseFilter={phaseFilter}
                      queueFilter={queueFilter}
                      sourceFilter={sourceFilter}
                      hrefBasePath={hrefBasePath}
                      allowLocalFixtureFacts={allowLocalFixtureFacts}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
