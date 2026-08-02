'use client'

import { InboxListItem } from '@/features/inbox/components/inbox-list-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { aosListGroupLabelClassName } from '@/lib/design-system'

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
    <div className="space-y-3">
      <div>
        <h3 className={aosListGroupLabelClassName}>Unbearbeitet</h3>
        {unprocessedItems.length === 0 ? (
          <p className={`px-2 py-1.5 text-[11px] text-zinc-400`}>Keine unbearbeiteten Elemente.</p>
        ) : (
          <ul className="flex flex-col">
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
        <div className="border-t border-zinc-200/40 pt-2.5">
          <h3 className={aosListGroupLabelClassName}>Bearbeitet</h3>
          <ul className="flex flex-col">
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
