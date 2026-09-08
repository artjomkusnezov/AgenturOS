'use client'

import { useMemo, useState } from 'react'

import { InboxKfzPhaseFilter } from '@/features/inbox/components/inbox-kfz-phase-filter'
import { InboxListItem } from '@/features/inbox/components/inbox-list-item'
import {
  countKfzWorkQueue,
  filterInboxItemsByKfzPhase,
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
}

export function InboxList({
  unprocessedItems,
  processedItems,
  selectedItemId,
  onSelectItem,
  memberNameMap = {},
  taskRelationsByItemId = {},
  phaseFilter = 'all',
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
  const selectedItem = allItems.find((item) => item.id === selectedItemId) ?? null
  const selectedPhase = selectedItem
    ? resolveKfzWorkQueuePhase(
        selectedItem,
        resolveInboxLinkedTaskId(selectedItem.id, taskRelationsByItemId),
      )
    : null
  const visibleUnprocessedItems = useMemo(
    () => filterInboxItemsByKfzPhase(unprocessedItems, phaseFilter, taskRelationsByItemId),
    [phaseFilter, taskRelationsByItemId, unprocessedItems],
  )
  const filteredProcessedItems = useMemo(
    () => filterInboxItemsByKfzPhase(processedItems, phaseFilter, taskRelationsByItemId),
    [phaseFilter, processedItems, taskRelationsByItemId],
  )

  const visibleProcessedItems = useMemo(() => {
    if (archiveExpanded || filteredProcessedItems.length <= ARCHIVED_PREVIEW_LIMIT) {
      return filteredProcessedItems
    }

    return filteredProcessedItems.slice(0, ARCHIVED_PREVIEW_LIMIT)
  }, [archiveExpanded, filteredProcessedItems])

  const canToggleArchive = filteredProcessedItems.length > ARCHIVED_PREVIEW_LIMIT
  const filterEmpty =
    visibleUnprocessedItems.length === 0 && filteredProcessedItems.length === 0

  return (
    <div className="space-y-3">
      <InboxKfzPhaseFilter
        activePhase={phaseFilter}
        counts={kfzCounts}
        selectedItemId={selectedItemId}
        selectedPhase={selectedPhase}
      />

      {filterEmpty ? (
        <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">
          Keine Kfz-Anfragen in diesem Stand.
        </p>
      ) : null}

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
    </div>
  )
}
