'use client'

import { useCallback, useState } from 'react'
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
import type { CaseTimelineEntry } from '@/features/cases/types/case-timeline'
import { CreateTaskForm } from '@/features/tasks/components/create-task-form'
import type { Task } from '@/features/tasks/types/task'
import type { WorkspaceView } from '@/features/workspace-views/types/workspace-view'

type CasesWorkspaceProps = {
  view: WorkspaceView
  cases: CaseRecord[]
  selectedCaseId: string | null
  /** Direkt geladener Deep-Link-Case (nicht nur aus der gefilterten Liste). */
  selectedCase: CaseRecord | null
  selectedCaseOrigin: CaseInboxOriginView | null
  selectedCaseTimelineEntries: CaseTimelineEntry[]
  selectedCaseOpenTasks: Task[]
  selectedCaseCompletedTasks: Task[]
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
  selectedCaseTimelineEntries,
  selectedCaseOpenTasks,
  selectedCaseCompletedTasks,
  memberNameMap,
  lookups,
  pathMode,
  emptyMessage,
}: CasesWorkspaceProps) {
  const router = useRouter()
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const listHref = buildCasesListHref(pathMode, view.key)
  const countLabel = cases.length === 1 ? '1 Vorgang' : `${cases.length} Vorgänge`

  const handleSelectCase = useCallback(
    (caseId: string) => {
      setIsCreatingTask(false)
      router.push(buildCasesItemHref(pathMode, view.key, { caseId }))
    },
    [pathMode, router, view.key],
  )

  const handleBackToList = useCallback(() => {
    setIsCreatingTask(false)
    router.push(listHref)
  }, [listHref, router])

  const handleStartCreateTask = useCallback(() => {
    setIsCreatingTask(true)
  }, [])

  const handleCancelCreateTask = useCallback(() => {
    setIsCreatingTask(false)
  }, [])

  const handleCreatedTask = useCallback(() => {
    setIsCreatingTask(false)
    router.refresh()
  }, [router])

  let detail = (
    <EmptyState
      title="Vorgang auswählen"
      description="Wählen Sie einen Eintrag aus der Liste."
    />
  )

  if (selectedCase && isCreatingTask) {
    detail = (
      <CreateTaskForm
        caseId={selectedCase.id}
        onCancel={handleCancelCreateTask}
        onCreated={handleCreatedTask}
      />
    )
  } else if (selectedCase) {
    detail = (
      <CaseDetailPanel
        caseRow={selectedCase}
        memberNameMap={memberNameMap}
        lookups={lookups}
        origin={selectedCaseOrigin}
        timelineEntries={selectedCaseTimelineEntries}
        openTasks={selectedCaseOpenTasks}
        completedTasks={selectedCaseCompletedTasks}
        onAddTask={handleStartCreateTask}
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
        showMobileDetail={selectedCaseId !== null || isCreatingTask}
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
