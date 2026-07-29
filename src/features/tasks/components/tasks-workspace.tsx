'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { CreateTaskForm } from '@/features/tasks/components/create-task-form'
import { TaskDetailPanel } from '@/features/tasks/components/task-detail-panel'
import { TaskEmptyDetail } from '@/features/tasks/components/task-empty-detail'
import { TaskList } from '@/features/tasks/components/task-list'
import type { Task } from '@/features/tasks/types/task'

type TasksWorkspaceProps = {
  tasks: Task[]
}

export function TasksWorkspace({ tasks }: TasksWorkspaceProps) {
  const router = useRouter()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  )

  const refreshTasks = useCallback(() => {
    router.refresh()
  }, [router])

  const handleSelectTask = useCallback((taskId: string) => {
    setIsCreating(false)
    setSelectedTaskId(taskId)
  }, [])

  const handleStartCreate = useCallback(() => {
    setSelectedTaskId(null)
    setIsCreating(true)
  }, [])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
  }, [])

  const handleCreated = useCallback(
    (taskId: string) => {
      setIsCreating(false)
      setSelectedTaskId(taskId)
      refreshTasks()
    },
    [refreshTasks]
  )

  const handleBackToList = useCallback(() => {
    setSelectedTaskId(null)
    setIsCreating(false)
  }, [])

  const handleDeleted = useCallback(() => {
    setSelectedTaskId(null)
    refreshTasks()
  }, [refreshTasks])

  const showMobileDetail = isCreating || selectedTask !== null

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:flex-row lg:gap-6">
      <section
        aria-label="Aufgabenliste"
        className={`flex w-full flex-col lg:w-80 lg:shrink-0 ${
          showMobileDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Aufgaben
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {tasks.length === 1
                ? '1 Aufgabe'
                : `${tasks.length} Aufgaben`}
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

        {tasks.length === 0 ? (
          <EmptyState
            title="Noch keine Aufgaben"
            description="Erstellen Sie Ihre erste Aufgabe, um mit der Planung zu beginnen."
          />
        ) : (
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
          />
        )}
      </section>

      <section
        aria-label="Aufgabendetails"
        className={`min-h-[24rem] flex-1 ${
          showMobileDetail ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {isCreating ? (
          <CreateTaskForm
            onCancel={handleCancelCreate}
            onCreated={handleCreated}
          />
        ) : selectedTask ? (
          <TaskDetailPanel
            key={selectedTask.id}
            task={selectedTask}
            onBack={handleBackToList}
            onDeleted={handleDeleted}
          />
        ) : (
          <TaskEmptyDetail />
        )}
      </section>
    </div>
  )
}
