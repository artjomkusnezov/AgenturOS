'use client'

import type { CaseRecord } from '@/features/cases/types/case'
import { CaseListItem } from '@/features/cases/components/case-list-item'

type CaseListProps = {
  cases: CaseRecord[]
  selectedCaseId: string | null
  memberNameMap: Record<string, string>
  onSelectCase: (caseId: string) => void
}

export function CaseList({
  cases,
  selectedCaseId,
  memberNameMap,
  onSelectCase,
}: CaseListProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {cases.map((caseRow) => (
        <li key={caseRow.id}>
          <CaseListItem
            caseRow={caseRow}
            isSelected={caseRow.id === selectedCaseId}
            memberNameMap={memberNameMap}
            onSelect={onSelectCase}
          />
        </li>
      ))}
    </ul>
  )
}
