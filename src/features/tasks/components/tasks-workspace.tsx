'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { CreateTaskForm } from '@/features/tasks/components/create-task-form'
import { TaskDetailErrorPanel } from '@/features/tasks/components/task-detail-error-panel'
import { TaskDetailPanel } from '@/features/tasks/components/task-detail-panel'
import { TaskEmptyDetail } from '@/features/tasks/components/task-empty-detail'
import { TaskList } from '@/features/tasks/components/task-list'
import type { TaskDetailLoadState } from '@/features/tasks/types/task-detail'
import type { Task } from '@/features/tasks/types/task'

type TasksWorkspaceProps = {
  openTasks: Task[]
  completedTasks: Task[]
  selectedTaskId: string | null
  memberNameMap: Record<string, string>
  detailState: TaskDetailLoadState
}

export function TasksWorkspace({
  openTasks,
  completedTasks,
  selectedTaskId,
  memberNameMap,
  detailState,
}: TasksWorkspaceProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const tasks = [...openTasks, ...completedTasks]
  const totalCount = tasks.length

  const refreshTasks = useCallback(() => {
    router.refresh()
  }, [router])

  const navigateToTask = useCallback(
    (taskId: string) => {
      router.push(`/app/tasks?task=${taskId}`)
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

  const showMobileDetail =
    isCreating ||
    selectedTaskId !== null ||
    detailState.status === 'invalid' ||
    detailState.status === 'not_found' ||
    detailState.status === 'error'

  const renderDetailPanel = () => {
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
          memberNameMap={memberNameMap}
          onBack={handleBackToList}
          onDeleted={handleDeleted}
          onWorkflowChange={handleWorkflowChange}
        />
      )
    }

    return <TaskEmptyDetail />
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col border-t border-zinc-200/70 lg:flex-row lg:border-t-0">
      <section
        aria-label="Vorgangsliste"
        className={`flex w-full flex-col border-zinc-200/70 lg:w-[22rem] lg:shrink-0 lg:border-r ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200/70 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Vorgänge
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {totalCount === 1 ? '1 Vorgang' : `${totalCount} Vorgänge`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartCreate}
            className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
          >
            Neu
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {totalCount === 0 ? (
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
          )}
        </div>
      </section>

      <section
        aria-label="Vorgangsdetails"
        className={`min-h-[24rem] flex-1 bg-zinc-50/40 p-4 lg:min-h-0 ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="flex min-h-0 w-full flex-1">{renderDetailPanel()}</div>
      </section>
    </div>
  )
}
