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
    <div className="flex flex-col gap-1 overflow-y-auto pr-1">
      {items.map((item) => (
        <InformationListItem
          key={item.id}
          item={item}
          isSelected={item.id === selectedItemId}
          onSelect={onSelectItem}
        />
      ))}
    </div>
  )
}
