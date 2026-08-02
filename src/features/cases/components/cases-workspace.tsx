'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import {
  CaseDetailPanel,
  type CaseInboxOriginView,
} from '@/features/cases/components/case-detail-panel'
import { CaseList } from '@/features/cases/components/case-list'
import {
  buildCasesItemHref,
  buildCasesListHref,
  type CasesWorkspacePathMode,
} from '@/features/cases/lib/cases-workspace-urls'
import type { CaseDisplayLookups } from '@/features/cases/lib/case-display'
import type { CaseRecord } from '@/features/cases/types/case'
import type { WorkspaceView } from '@/features/workspace-views/types/workspace-view'

type CasesWorkspaceProps = {
  view: WorkspaceView
  cases: CaseRecord[]
  selectedCaseId: string | null
  /** Direkt geladener Deep-Link-Case (nicht nur aus der gefilterten Liste). */
  selectedCase: CaseRecord | null
  selectedCaseOrigin: CaseInboxOriginView | null
  memberNameMap: Record<string, string>
  lookups: CaseDisplayLookups
  pathMode: CasesWorkspacePathMode
  emptyMessage: string
}

export function CasesWorkspace({
  view,
  cases,
  selectedCaseId,
  selectedCase,
  selectedCaseOrigin,
  memberNameMap,
  lookups,
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

  let detail = (
    <EmptyState
      title="Vorgang auswählen"
      description="Wählen Sie einen Eintrag aus der Liste."
    />
  )

  if (selectedCase) {
    detail = (
      <CaseDetailPanel
        caseRow={selectedCase}
        memberNameMap={memberNameMap}
        lookups={lookups}
        origin={selectedCaseOrigin}
        onBack={handleBackToList}
      />
    )
  } else if (selectedCaseId) {
    detail = (
      <EmptyState
        title="Vorgang nicht gefunden"
        description="Der angeforderte Vorgang ist nicht verfügbar oder Sie haben keinen Zugriff."
      />
    )
  }

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
              lookups={lookups}
              onSelectCase={handleSelectCase}
            />
          )
        }
        detail={detail}
      />
    </WorkspaceFrame>
  )
}
