'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconCheckSquare } from '@/features/dashboard/components/dashboard-icons'
import { completeTaskAction } from '@/features/tasks/actions/complete-task'
import { reopenTaskAction } from '@/features/tasks/actions/reopen-task'
import { TaskDueDateLabel } from '@/features/tasks/components/task-due-date-label'
import { TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import { isTaskOpen } from '@/features/tasks/lib/task-status'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'
import {
  aosListStatusBtnClassName,
  aosListStatusBtnDoneClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type CaseTasksSectionProps = {
  openTasks: Task[]
  completedTasks: Task[]
  onAddTask: () => void
}

const initialState: TaskMutationState = {}

function CaseTaskStatusToggle({
  taskId,
  variant,
}: {
  taskId: string
  variant: 'complete' | 'reopen'
}) {
  const router = useRouter()
  const action = variant === 'complete' ? completeTaskAction : reopenTaskAction
  const [state, formAction, isPending] = useActionState(action, initialState)
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [taskId, variant])

  useEffect(() => {
    if (wasPendingRef.current && !isPending && state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      router.refresh()
    }

    wasPendingRef.current = isPending
  }, [isPending, state.success, router])

  return (
    <div className="flex shrink-0 flex-col items-center">
      <form action={formAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <button
          type="submit"
          disabled={isPending}
          aria-label={variant === 'complete' ? 'Aufgabe erledigen' : 'Aufgabe wieder öffnen'}
          className={
            variant === 'complete' ? aosListStatusBtnClassName : aosListStatusBtnDoneClassName
          }
        >
          {isPending ? (
            <span className="text-[8px] text-zinc-400">…</span>
          ) : (
            <svg
              className="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      </form>
      {state.error ? (
        <p className="max-w-16 text-center text-[10px] leading-tight text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}

function CaseTaskRow({ task, subdued = false }: { task: Task; subdued?: boolean }) {
  const isOpen = isTaskOpen(task)
  const statusLabel = isOpen ? 'Offen' : 'Erledigt'

  return (
    <li className="flex items-start gap-2.5 py-2">
      <CaseTaskStatusToggle
        taskId={task.id}
        variant={isOpen ? 'complete' : 'reopen'}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/app/tasks?task=${encodeURIComponent(task.id)}`}
          className={`block truncate text-[13px] leading-snug transition-colors hover:text-zinc-950 ${
            subdued ? 'font-normal text-zinc-500' : 'font-medium text-zinc-900'
          }`}
        >
          {task.title}
        </Link>
        <div
          className={`mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-none ${
            subdued ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          <span>{TASK_PRIORITY_LABELS[task.priority]}</span>
          <span className="text-zinc-300">·</span>
          <span>{statusLabel}</span>
          <TaskDueDateLabel task={task} subdued={subdued || !isOpen} />
        </div>
      </div>
    </li>
  )
}

export function CaseTasksSection({
  openTasks,
  completedTasks,
  onAddTask,
}: CaseTasksSectionProps) {
  const [completedOpen, setCompletedOpen] = useState(false)
  const completedCount = completedTasks.length
  const completedLabel =
    completedCount === 1
      ? '1 erledigte Aufgabe'
      : `${completedCount} erledigte Aufgaben`

  return (
    <section aria-label="Aufgaben" className={aosWorkspaceSectionClassName}>
      <div className="flex items-start justify-between gap-3">
        <WorkspaceSectionHeading
          title="Aufgaben"
          accent="blue"
          icon={<DashboardIconCheckSquare className="h-4 w-4" />}
        />
        <button
          type="button"
          onClick={onAddTask}
          className={aosWorkspaceActionAccentClassName}
        >
          + Aufgabe hinzufügen
        </button>
      </div>

      {openTasks.length === 0 && completedTasks.length === 0 ? (
        <p className={`mt-1 ${aosWorkspaceMetaClassName}`}>
          Noch keine Aufgaben in diesem Vorgang.
        </p>
      ) : null}

      {openTasks.length > 0 ? (
        <ul className="mt-1 divide-y divide-zinc-100/80">
          {openTasks.map((task) => (
            <CaseTaskRow key={task.id} task={task} />
          ))}
        </ul>
      ) : null}

      {completedCount > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setCompletedOpen((value) => !value)}
            className={`${aosWorkspaceMetaClassName} inline-flex items-center gap-1.5 transition-colors hover:text-zinc-700`}
            aria-expanded={completedOpen}
          >
            <span aria-hidden="true">{completedOpen ? '▾' : '▸'}</span>
            <span>{completedLabel}</span>
          </button>
          {completedOpen ? (
            <ul className="mt-1 divide-y divide-zinc-100/80">
              {completedTasks.map((task) => (
                <CaseTaskRow key={task.id} task={task} subdued />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
