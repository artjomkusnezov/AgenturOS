'use client'

import {
  formatCaseCoreStatusLabel,
  formatCaseDueAtLabel,
  isCaseDueOverdue,
  isCaseOpenForDue,
  resolveBusinessAreaLabel,
  resolveCaseTypeLabel,
  type CaseDisplayLookups,
} from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListRowSubduedClassName,
  aosListSelectedClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type CaseListItemProps = {
  caseRow: CaseRecord
  isSelected: boolean
  subdued?: boolean
  memberNameMap: Record<string, string>
  lookups: CaseDisplayLookups
  onSelect: (caseId: string) => void
}

export function CaseListItem({
  caseRow,
  isSelected,
  subdued = false,
  memberNameMap,
  lookups,
  onSelect,
}: CaseListItemProps) {
  const typeLabel = resolveCaseTypeLabel(caseRow.case_type_id, lookups.caseTypesById)
  const statusLabel = formatCaseCoreStatusLabel(caseRow.core_status)
  const businessAreaLabel = resolveBusinessAreaLabel(
    caseRow.business_area_id,
    lookups.businessAreasById,
  )
  const assigneeName = caseRow.assignee_user_id
    ? resolveTaskMemberName(caseRow.assignee_user_id, memberNameMap)
    : null
  const dueLabel = caseRow.due_at
    ? formatCaseDueAtLabel(caseRow.due_at, undefined, isCaseOpenForDue(caseRow))
    : null
  const dueOverdue = isCaseDueOverdue(caseRow)

  const secondaryParts = [
    typeLabel,
    statusLabel,
    businessAreaLabel,
    assigneeName ?? dueLabel,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={() => onSelect(caseRow.id)}
      className={`${aosListRowClassName} ${
        isSelected
          ? aosListSelectedClassName
          : subdued
            ? aosListRowSubduedClassName
            : aosListRowHoverClassName
      } w-full text-left`}
    >
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${aosWsTextPrimaryClassName}`}>{caseRow.title}</p>
        <p className={`mt-0.5 truncate text-xs ${aosWsTextMetaClassName}`}>
          {secondaryParts.join(' · ')}
          {assigneeName && dueLabel ? (
            <>
              {' · '}
              <span className={dueOverdue ? 'font-medium text-red-400' : undefined}>
                {dueLabel}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </button>
  )
}
