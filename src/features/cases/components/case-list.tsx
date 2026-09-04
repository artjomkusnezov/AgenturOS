'use client'

import { useMemo, useState } from 'react'

import { CaseListItem } from '@/features/cases/components/case-list-item'
import { isCaseOpenForDue, type CaseDisplayLookups } from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import { aosListGroupLabelClassName } from '@/lib/design-system'

const COMPLETED_PREVIEW_LIMIT = 5

type CaseListProps = {
  cases: CaseRecord[]
  selectedCaseId: string | null
  memberNameMap: Record<string, string>
  lookups: CaseDisplayLookups
  onSelectCase: (caseId: string) => void
}

function sortOpenCases(cases: CaseRecord[]): CaseRecord[] {
  return [...cases].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

function sortCompletedCases(cases: CaseRecord[]): CaseRecord[] {
  return [...cases].sort((a, b) => {
    const aDone = a.completed_at ? new Date(a.completed_at).getTime() : new Date(a.updated_at).getTime()
    const bDone = b.completed_at ? new Date(b.completed_at).getTime() : new Date(b.updated_at).getTime()
    return bDone - aDone
  })
}

export function CaseList({
  cases,
  selectedCaseId,
  memberNameMap,
  lookups,
  onSelectCase,
}: CaseListProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const { openCases, completedCases } = useMemo(() => {
    const open: CaseRecord[] = []
    const completed: CaseRecord[] = []

    for (const caseRow of cases) {
      if (isCaseOpenForDue(caseRow)) {
        open.push(caseRow)
      } else {
        completed.push(caseRow)
      }
    }

    return {
      openCases: sortOpenCases(open),
      completedCases: sortCompletedCases(completed),
    }
  }, [cases])

  const visibleCompletedCases = useMemo(() => {
    if (completedExpanded || completedCases.length <= COMPLETED_PREVIEW_LIMIT) {
      return completedCases
    }

    return completedCases.slice(0, COMPLETED_PREVIEW_LIMIT)
  }, [completedExpanded, completedCases])

  const canToggleCompleted = completedCases.length > COMPLETED_PREVIEW_LIMIT

  // Flat list when there is no completed partition to show (all open).
  if (completedCases.length === 0) {
    return (
      <ul className="flex flex-col gap-0.5">
        {openCases.map((caseRow) => (
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

  return (
    <div className="space-y-3">
      <div>
        <h3 className={aosListGroupLabelClassName}>Offen</h3>
        {openCases.length === 0 ? (
          <p className="aos-ws-text-muted px-2 py-1.5 text-[11px]">Keine offenen Vorgänge.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {openCases.map((caseRow) => (
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
        )}
      </div>

      <div className="border-t border-zinc-200/40 pt-2.5">
        <h3 className={aosListGroupLabelClassName}>Erledigt</h3>
        <ul className="flex flex-col gap-0.5">
          {visibleCompletedCases.map((caseRow) => (
            <li key={caseRow.id}>
              <CaseListItem
                caseRow={caseRow}
                isSelected={caseRow.id === selectedCaseId}
                subdued
                memberNameMap={memberNameMap}
                lookups={lookups}
                onSelect={onSelectCase}
              />
            </li>
          ))}
        </ul>
        {canToggleCompleted ? (
          <button
            type="button"
            className="aos-ws-archive-toggle"
            onClick={() => setCompletedExpanded((open) => !open)}
            aria-expanded={completedExpanded}
          >
            {completedExpanded ? 'Erledigte einklappen' : 'Alle erledigten anzeigen'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
