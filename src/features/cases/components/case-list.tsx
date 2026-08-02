'use client'

import type { CaseDisplayLookups } from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import { CaseListItem } from '@/features/cases/components/case-list-item'

type CaseListProps = {
  cases: CaseRecord[]
  selectedCaseId: string | null
  memberNameMap: Record<string, string>
  lookups: CaseDisplayLookups
  onSelectCase: (caseId: string) => void
}

export function CaseList({
  cases,
  selectedCaseId,
  memberNameMap,
  lookups,
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
            lookups={lookups}
            onSelect={onSelectCase}
          />
        </li>
      ))}
    </ul>
  )
}
