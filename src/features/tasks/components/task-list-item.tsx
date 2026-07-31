'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { completeTaskAction } from '@/features/tasks/actions/complete-task'
import { reopenTaskAction } from '@/features/tasks/actions/reopen-task'
import { TaskDueDateLabel } from '@/features/tasks/components/task-due-date-label'
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  formatTaskDateTime,
  formatTaskListDescription,
  isTaskOpen,
} from '@/features/tasks/lib/task-status'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'

type TaskListItemProps = {
  task: Task
  isSelected: boolean
  subdued?: boolean
  memberNameMap: Record<string, string>
  onSelect: (taskId: string) => void
}

const initialState: TaskMutationState = {}

function TaskStatusForm({
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
    <div className="flex shrink-0 flex-col items-center gap-1">
      <form
        action={formAction}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => event.stopPropagation()}
      >
        <input type="hidden" name="taskId" value={taskId} />
        <button
          type="submit"
          disabled={isPending}
          aria-label={variant === 'complete' ? 'Aufgabe erledigen' : 'Aufgabe wieder öffnen'}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
            variant === 'complete'
              ? 'border-zinc-200/80 bg-white text-zinc-500 hover:border-accent/40 hover:text-accent'
              : 'border-zinc-200/80 bg-zinc-50 text-zinc-600 hover:bg-white hover:text-zinc-900'
          }`}
        >
          {isPending ? (
            <span className="text-xs">…</span>
          ) : variant === 'complete' ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6h18M3 18h10" />
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

export function TaskListItem({
  task,
  isSelected,
  subdued = false,
  memberNameMap,
  onSelect,
}: TaskListItemProps) {
  const isOpen = isTaskOpen(task)
  const assigneeName = resolveTaskMemberName(task.assignee_user_id, memberNameMap)

  return (
    <div
      className={`flex items-start gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors duration-150 ${
        isSelected
          ? 'bg-white ring-1 ring-zinc-200/80'
          : subdued
            ? 'hover:bg-white/60'
            : 'hover:bg-white/80'
      }`}
    >
      <TaskStatusForm taskId={task.id} variant={isOpen ? 'complete' : 'reopen'} />

      <button
        type="button"
        onClick={() => onSelect(task.id)}
        aria-current={isSelected ? 'true' : undefined}
        className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <p
          className={`truncate text-sm font-medium ${
            subdued ? 'text-zinc-600' : 'text-zinc-900'
          }`}
        >
          {task.title}
        </p>

        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {formatTaskListDescription(task.description)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span>{formatTaskDateTime(task.created_at)}</span>
          <span>{assigneeName}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TaskPriorityBadge priority={task.priority} subdued={subdued} />
          <TaskDueDateLabel task={task} subdued={subdued || !isOpen} />
        </div>
      </button>
    </div>
  )
}
