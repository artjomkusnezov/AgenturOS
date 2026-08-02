'use client'

import { InformationListItem } from '@/features/information/components/information-list-item'
import type { InformationItem } from '@/features/information/types/information-item'

type InformationListProps = {
  items: InformationItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
}

export function InformationList({
  items,
  selectedItemId,
  onSelectItem,
}: InformationListProps) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id}>
          <InformationListItem
            item={item}
            isSelected={item.id === selectedItemId}
            onSelect={onSelectItem}
          />
        </li>
      ))}
    </ul>
  )
}
