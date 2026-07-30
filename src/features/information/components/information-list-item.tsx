'use client'

import { truncateInformationContentPreview } from '@/features/information/lib/format-information-content'
import { formatInformationDateTime } from '@/features/information/lib/information-status'
import type { InformationItem } from '@/features/information/types/information-item'

type InformationListItemProps = {
  item: InformationItem
  isSelected: boolean
  onSelect: (itemId: string) => void
}

export function InformationListItem({
  item,
  isSelected,
  onSelect,
}: InformationListItemProps) {
  const preview = truncateInformationContentPreview(item.content)

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isSelected
          ? 'bg-white shadow-sm ring-1 ring-zinc-200/80'
          : 'hover:bg-white/70'
      }`}
    >
      <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>

      {preview ? (
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{preview}</p>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500">
        Geändert am {formatInformationDateTime(item.updated_at)}
      </p>
    </button>
  )
}
