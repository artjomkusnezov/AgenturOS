'use client'

import { useMemo, useState } from 'react'

import { InboxListItem } from '@/features/inbox/components/inbox-list-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { aosListGroupLabelClassName } from '@/lib/design-system'

const ARCHIVED_PREVIEW_LIMIT = 5

type InboxListProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
  memberNameMap?: Record<string, string>
}

export function InboxList({
  unprocessedItems,
  processedItems,
  selectedItemId,
  onSelectItem,
  memberNameMap = {},
}: InboxListProps) {
  const [archiveExpanded, setArchiveExpanded] = useState(false)

  const visibleProcessedItems = useMemo(() => {
    if (archiveExpanded || processedItems.length <= ARCHIVED_PREVIEW_LIMIT) {
      return processedItems
    }

    return processedItems.slice(0, ARCHIVED_PREVIEW_LIMIT)
  }, [archiveExpanded, processedItems])

  const canToggleArchive = processedItems.length > ARCHIVED_PREVIEW_LIMIT

  return (
    <div className="space-y-3">
      <div>
        <h3 className={aosListGroupLabelClassName}>Unbearbeitet</h3>
        {unprocessedItems.length === 0 ? (
          <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">Keine unbearbeiteten Elemente.</p>
        ) : (
          <ul className="flex flex-col">
            {unprocessedItems.map((item) => (
              <li key={item.id}>
                <InboxListItem
                  item={item}
                  isSelected={item.id === selectedItemId}
                  onSelect={onSelectItem}
                  memberNameMap={memberNameMap}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {processedItems.length > 0 ? (
        <div className="border-t border-zinc-200/40 pt-2.5">
          <h3 className={aosListGroupLabelClassName}>Bearbeitet</h3>
          <ul className="flex flex-col">
            {visibleProcessedItems.map((item) => (
              <li key={item.id}>
                <InboxListItem
                  item={item}
                  isSelected={item.id === selectedItemId}
                  subdued
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
