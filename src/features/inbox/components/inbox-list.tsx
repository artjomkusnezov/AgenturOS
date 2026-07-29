'use client'

import { InboxListItem } from '@/features/inbox/components/inbox-list-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type InboxListProps = {
  unprocessedItems: InboxItem[]
  processedItems: InboxItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
}

export function InboxList({
  unprocessedItems,
  processedItems,
  selectedItemId,
  onSelectItem,
}: InboxListProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Unbearbeitet
        </h3>
        {unprocessedItems.length === 0 ? (
          <p className="px-1 py-3 text-sm text-zinc-500">Keine unbearbeiteten Elemente.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {unprocessedItems.map((item) => (
              <li key={item.id}>
                <InboxListItem
                  item={item}
                  isSelected={item.id === selectedItemId}
                  onSelect={onSelectItem}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {processedItems.length > 0 ? (
        <div className="border-t border-zinc-200/70 pt-4">
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Bearbeitet
          </h3>
          <ul className="flex flex-col gap-1">
            {processedItems.map((item) => (
              <li key={item.id}>
                <InboxListItem
                  item={item}
                  isSelected={item.id === selectedItemId}
                  subdued
                  onSelect={onSelectItem}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
