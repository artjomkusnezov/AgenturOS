'use client'

import { truncateInformationContentPreview } from '@/features/information/lib/format-information-content'
import { formatInformationListDate } from '@/features/information/lib/information-status'
import type { InformationItem } from '@/features/information/types/information-item'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListSelectedClassName,
} from '@/lib/design-system'

type InformationListItemProps = {
  item: InformationItem
  isSelected: boolean
  onSelect: (itemId: string) => void
  memberNameMap?: Record<string, string>
}

export function InformationListItem({
  item,
  isSelected,
  onSelect,
  memberNameMap = {},
}: InformationListItemProps) {
  const preview = truncateInformationContentPreview(item.content)
  const creatorName = resolveTaskMemberName(item.created_by ?? item.user_id, memberNameMap)

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`${aosListRowClassName} flex-col items-stretch gap-0.5 ${
        isSelected ? aosListSelectedClassName : aosListRowHoverClassName
      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      <p className="w-full truncate text-[13px] font-medium leading-snug text-zinc-900">
        {item.title}
      </p>
      <p className="w-full truncate text-[11px] leading-none text-zinc-400">
        <span>{formatInformationListDate(item.updated_at)}</span>
        <span className="mx-1 text-zinc-300">·</span>
        <span>{creatorName}</span>
        {preview ? (
          <>
            <span className="mx-1 text-zinc-300">·</span>
            <span className="text-zinc-500">{preview}</span>
          </>
        ) : null}
      </p>
    </button>
  )
}
