'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import { CreateTaskForm } from '@/features/tasks/components/create-task-form'
import { TaskDetailErrorPanel } from '@/features/tasks/components/task-detail-error-panel'
import { TaskDetailPanel } from '@/features/tasks/components/task-detail-panel'
import { TaskEmptyDetail } from '@/features/tasks/components/task-empty-detail'
import { TaskFilePreview } from '@/features/tasks/components/task-file-preview'
import { TaskFilePreviewError } from '@/features/tasks/components/task-file-preview-error'
import { TaskList } from '@/features/tasks/components/task-list'
import type { TaskDetailLoadState } from '@/features/tasks/types/task-detail'
import type { TaskFilePreviewLoadState } from '@/features/tasks/types/task-file-preview'
import type { Task } from '@/features/tasks/types/task'
import {
  aosAlertWarningClassName,
  aosWorkspaceActionAccentClassName,
} from '@/lib/design-system'

type TasksWorkspaceProps = {
  openTasks: Task[]
  completedTasks: Task[]
  selectedTaskId: string | null
  selectedFileId: string | null
  memberNameMap: Record<string, string>
  agencyMembers: AgencyMember[]
  detailState: TaskDetailLoadState
  filePreviewState: TaskFilePreviewLoadState
  taskAttachmentNotice?: string | null
}

export function TasksWorkspace({
  openTasks,
  completedTasks,
  selectedTaskId,
  selectedFileId,
  memberNameMap,
  agencyMembers,
  detailState,
  filePreviewState,
  taskAttachmentNotice = null,
}: TasksWorkspaceProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [dismissedNoticeForTaskId, setDismissedNoticeForTaskId] = useState<string | null>(null)

  const captureNotice =
    taskAttachmentNotice && dismissedNoticeForTaskId !== selectedTaskId
      ? taskAttachmentNotice
      : null

  const tasks = [...openTasks, ...completedTasks]
  const totalCount = tasks.length
  const countLabel = totalCount === 1 ? '1 Vorgang' : `${totalCount} Vorgänge`

  const handleDismissCaptureNotice = useCallback(() => {
    if (selectedTaskId) {
      setDismissedNoticeForTaskId(selectedTaskId)
      router.replace(`/app/tasks?task=${selectedTaskId}`)
    }
  }, [router, selectedTaskId])

  const refreshTasks = useCallback(() => {
    router.refresh()
  }, [router])

  const navigateToTask = useCallback(
    (taskId: string) => {
      router.push(`/app/tasks?task=${taskId}`)
    },
    [router],
  )

  const navigateToTaskFile = useCallback(
    (taskId: string, fileId: string) => {
      router.push(`/app/tasks?task=${taskId}&file=${fileId}`)
    },
    [router],
  )

  const navigateToList = useCallback(() => {
    router.push('/app/tasks')
  }, [router])

  const handleSelectTask = useCallback(
    (taskId: string) => {
      setIsCreating(false)
      navigateToTask(taskId)
    },
    [navigateToTask],
  )

  const handleOpenFile = useCallback(
    (fileId: string) => {
      if (!selectedTaskId) {
        return
      }

      navigateToTaskFile(selectedTaskId, fileId)
    },
    [navigateToTaskFile, selectedTaskId],
  )

  const handleCloseFilePreview = useCallback(() => {
    if (!selectedTaskId) {
      navigateToList()
      return
    }

    navigateToTask(selectedTaskId)
  }, [navigateToList, navigateToTask, selectedTaskId])

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    navigateToList()
  }, [navigateToList])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
  }, [])

  const handleCreated = useCallback(
    (taskId: string) => {
      setIsCreating(false)
      navigateToTask(taskId)
      refreshTasks()
    },
    [navigateToTask, refreshTasks],
  )

  const handleBackToList = useCallback(() => {
    setIsCreating(false)
    navigateToList()
  }, [navigateToList])

  const handleDeleted = useCallback(() => {
    navigateToList()
    refreshTasks()
  }, [navigateToList, refreshTasks])

  const handleWorkflowChange = useCallback(() => {
    refreshTasks()
  }, [refreshTasks])

  const handleRetryFilePreview = useCallback(() => {
    refreshTasks()
  }, [refreshTasks])

  const showFilePreview =
    selectedFileId !== null &&
    (filePreviewState.status === 'ready' ||
      filePreviewState.status === 'error' ||
      filePreviewState.status === 'invalid' ||
      filePreviewState.status === 'no_task')

  const showMobileDetail =
    isCreating ||
    selectedTaskId !== null ||
    showFilePreview ||
    detailState.status === 'invalid' ||
    detailState.status === 'not_found' ||
    detailState.status === 'error'

  const renderDetailPanel = () => {
    if (showFilePreview) {
      if (filePreviewState.status === 'ready' && selectedTaskId) {
        return (
          <TaskFilePreview
            file={filePreviewState.file}
            previewUrl={filePreviewState.previewUrl}
            onClose={handleCloseFilePreview}
          />
        )
      }

      if (filePreviewState.status === 'no_task') {
        return (
          <TaskFilePreviewError
            message="Bitte wählen Sie zuerst einen Vorgang aus."
            onClose={handleBackToList}
          />
        )
      }

      if (filePreviewState.status === 'invalid') {
        return (
          <TaskFilePreviewError
            message="Die ausgewählte Datei ist ungültig."
            onClose={handleCloseFilePreview}
          />
        )
      }

      return (
        <TaskFilePreviewError
          message={
            filePreviewState.status === 'error'
              ? filePreviewState.message
              : 'Die Datei konnte nicht geöffnet werden.'
          }
          onClose={handleCloseFilePreview}
          onRetry={handleRetryFilePreview}
        />
      )
    }

    if (isCreating) {
      return (
        <CreateTaskForm onCancel={handleCancelCreate} onCreated={handleCreated} />
      )
    }

    if (!selectedTaskId) {
      return <TaskEmptyDetail />
    }

    if (detailState.status === 'invalid') {
      return (
        <TaskDetailErrorPanel
          message="Der ausgewählte Vorgang ist ungültig."
          onBack={handleBackToList}
        />
      )
    }

    if (detailState.status === 'not_found') {
      return (
        <TaskDetailErrorPanel
          message="Der Vorgang konnte nicht geladen werden."
          onBack={handleBackToList}
        />
      )
    }

    if (detailState.status === 'error') {
      return (
        <TaskDetailErrorPanel
          message={detailState.message}
          onBack={handleBackToList}
        />
      )
    }

    if (detailState.status === 'ready') {
      return (
        <TaskDetailPanel
          key={detailState.task.id}
          task={detailState.task}
          timelineEntries={detailState.timelineEntries}
          linkedFiles={detailState.linkedFiles}
          linkedInformation={detailState.linkedInformation}
          availableFiles={detailState.availableFiles}
          availableInformation={detailState.availableInformation}
          selectedFileId={selectedFileId}
          memberNameMap={memberNameMap}
          agencyMembers={agencyMembers}
          onOpenFile={handleOpenFile}
          onBack={handleBackToList}
          onDeleted={handleDeleted}
          onWorkflowChange={handleWorkflowChange}
        />
      )
    }

    return <TaskEmptyDetail />
  }

  return (
    <WorkspaceFrame
      compact
      meta={countLabel}
      primary={
        <button type="button" onClick={handleStartCreate} className={aosWorkspaceActionAccentClassName}>
          Neu
        </button>
      }
    >
      <WorkspaceSplit
        listLabel="Vorgangsliste"
        detailLabel={showFilePreview ? 'Dateivorschau' : 'Vorgangsdetails'}
        showMobileDetail={showMobileDetail}
        list={
          totalCount === 0 ? (
            <EmptyState
              title="Noch keine Vorgänge"
              description="Erstellen Sie Ihren ersten Vorgang, um mit der Bearbeitung zu beginnen."
            />
          ) : (
            <TaskList
              openTasks={openTasks}
              completedTasks={completedTasks}
              selectedTaskId={selectedTaskId}
              memberNameMap={memberNameMap}
              onSelectTask={handleSelectTask}
            />
          )
        }
        detail={
          <>
            {captureNotice ? (
              <div role="status" className={`mb-3 ${aosAlertWarningClassName}`}>
                <div className="flex items-start justify-between gap-3">
                  <p>{captureNotice}</p>
                  <button
                    type="button"
                    onClick={handleDismissCaptureNotice}
                    className="shrink-0 text-xs font-medium text-amber-800 transition-colors duration-150 hover:text-amber-950"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            ) : null}
            <div className="flex min-h-0 w-full flex-1 flex-col">{renderDetailPanel()}</div>
          </>
        }
      />
    </WorkspaceFrame>
  )
}
