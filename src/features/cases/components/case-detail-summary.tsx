'use client'

import type { CaseRecord } from '@/features/cases/types/case'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  aosWorkspaceActionClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type CaseDetailSummaryProps = {
  caseRow: CaseRecord
  memberNameMap: Record<string, string>
  onBack: () => void
}

export function CaseDetailSummary({
  caseRow,
  memberNameMap,
  onBack,
}: CaseDetailSummaryProps) {
  const assigneeName = caseRow.assignee_user_id
    ? resolveTaskMemberName(caseRow.assignee_user_id, memberNameMap)
    : 'Nicht zugewiesen'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 lg:hidden">
        <button type="button" onClick={onBack} className={aosWorkspaceActionClassName}>
          Zurück zur Liste
        </button>
      </div>

      <div className={aosWorkspaceSectionClassName}>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          {caseRow.title}
        </h2>
        <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>
          Status: {caseRow.core_status}
          {' · '}
          Verantwortung: {assigneeName}
        </p>
        {caseRow.description ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {caseRow.description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Keine Beschreibung.</p>
        )}
      </div>
    </div>
  )
}
