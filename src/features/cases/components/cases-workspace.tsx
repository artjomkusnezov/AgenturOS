'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { CaseDetailSummary } from '@/features/cases/components/case-detail-summary'
import { CaseList } from '@/features/cases/components/case-list'
import {
  buildCasesItemHref,
  buildCasesListHref,
  type CasesWorkspacePathMode,
} from '@/features/cases/lib/cases-workspace-urls'
import type { CaseRecord } from '@/features/cases/types/case'
import type { WorkspaceView } from '@/features/workspace-views/types/workspace-view'

type CasesWorkspaceProps = {
  view: WorkspaceView
  cases: CaseRecord[]
  selectedCaseId: string | null
  /** Direkt geladener Deep-Link-Case (nicht nur aus der gefilterten Liste). */
  selectedCase: CaseRecord | null
  memberNameMap: Record<string, string>
  pathMode: CasesWorkspacePathMode
  emptyMessage: string
}

export function CasesWorkspace({
  view,
  cases,
  selectedCaseId,
  selectedCase,
  memberNameMap,
  pathMode,
  emptyMessage,
}: CasesWorkspaceProps) {
  const router = useRouter()
  const listHref = buildCasesListHref(pathMode, view.key)
  const countLabel = cases.length === 1 ? '1 Vorgang' : `${cases.length} Vorgänge`

  const handleSelectCase = useCallback(
    (caseId: string) => {
      router.push(buildCasesItemHref(pathMode, view.key, { caseId }))
    },
    [pathMode, router, view.key],
  )

  const handleBackToList = useCallback(() => {
    router.push(listHref)
  }, [listHref, router])

  return (
    <WorkspaceFrame compact meta={`${view.name} · ${countLabel}`}>
      <WorkspaceSplit
        listLabel={view.name}
        detailLabel="Vorgangsdetails"
        showMobileDetail={selectedCaseId !== null}
        list={
          cases.length === 0 ? (
            <EmptyState
              title={emptyMessage}
              description="Sobald passende Vorgänge vorhanden sind, erscheinen sie hier."
            />
          ) : (
            <CaseList
              cases={cases}
              selectedCaseId={selectedCaseId}
              memberNameMap={memberNameMap}
              onSelectCase={handleSelectCase}
            />
          )
        }
        detail={
          selectedCase ? (
            <CaseDetailSummary
              caseRow={selectedCase}
              memberNameMap={memberNameMap}
              onBack={handleBackToList}
            />
          ) : (
            <EmptyState
              title="Vorgang auswählen"
              description="Wählen Sie einen Eintrag aus der Liste."
            />
          )
        }
      />
    </WorkspaceFrame>
  )
}
