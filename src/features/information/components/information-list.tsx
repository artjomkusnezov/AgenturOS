'use client'

import { InformationListItem } from '@/features/information/components/information-list-item'
import type { InformationItem } from '@/features/information/types/information-item'

type InformationListProps = {
  items: InformationItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string) => void
  memberNameMap?: Record<string, string>
}

export function InformationList({
  items,
  selectedItemId,
  onSelectItem,
  memberNameMap = {},
}: InformationListProps) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id}>
          <InformationListItem
            item={item}
            isSelected={item.id === selectedItemId}
            onSelect={onSelectItem}
            memberNameMap={memberNameMap}
          />
        </li>
      ))}
    </ul>
  )
}
