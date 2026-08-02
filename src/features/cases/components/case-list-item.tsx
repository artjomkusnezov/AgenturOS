'use client'

import type { CaseRecord } from '@/features/cases/types/case'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListSelectedClassName,
} from '@/lib/design-system'

type CaseListItemProps = {
  caseRow: CaseRecord
  isSelected: boolean
  memberNameMap: Record<string, string>
  onSelect: (caseId: string) => void
}

export function CaseListItem({
  caseRow,
  isSelected,
  memberNameMap,
  onSelect,
}: CaseListItemProps) {
  const assigneeName = caseRow.assignee_user_id
    ? resolveTaskMemberName(caseRow.assignee_user_id, memberNameMap)
    : null

  return (
    <button
      type="button"
      onClick={() => onSelect(caseRow.id)}
      className={`${aosListRowClassName} ${aosListRowHoverClassName} ${
        isSelected ? aosListSelectedClassName : ''
      } w-full text-left`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{caseRow.title}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {[caseRow.core_status, assigneeName].filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  )
}
