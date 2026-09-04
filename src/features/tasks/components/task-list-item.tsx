'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { completeTaskAction } from '@/features/tasks/actions/complete-task'
import { reopenTaskAction } from '@/features/tasks/actions/reopen-task'
import { TaskDueDateLabel } from '@/features/tasks/components/task-due-date-label'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import { TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import {
  formatTaskListDate,
  isTaskOpen,
} from '@/features/tasks/lib/task-status'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListRowSubduedClassName,
  aosListSelectedClassName,
  aosListStatusBtnClassName,
  aosListStatusBtnDoneClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

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
    <div className="flex shrink-0 flex-col items-center">
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

export function TaskListItem({
  task,
  isSelected,
  subdued = false,
  memberNameMap,
  onSelect,
}: TaskListItemProps) {
  const isOpen = isTaskOpen(task)
  const assigneeName = resolveTaskMemberName(task.assignee_user_id, memberNameMap)
  const showPriority = task.priority === 'high' || task.priority === 'low'

  return (
    <div
      className={`${aosListRowClassName} ${
        isSelected
          ? aosListSelectedClassName
          : subdued
            ? aosListRowSubduedClassName
            : aosListRowHoverClassName
      }`}
    >
      <TaskStatusForm taskId={task.id} variant={isOpen ? 'complete' : 'reopen'} />

      <button
        type="button"
        onClick={() => onSelect(task.id)}
        aria-current={isSelected ? 'true' : undefined}
        className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <p className={`truncate text-[13px] leading-snug font-medium ${aosWsTextPrimaryClassName}`}>
          {task.title}
        </p>

        <div
          className={`mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-none ${aosWsTextMetaClassName}`}
        >
          <span className="truncate">{formatTaskListDate(task.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{assigneeName}</span>
          {task.case_id ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">Vorgang</span>
            </>
          ) : null}
          {showPriority ? (
            <>
              <span aria-hidden="true">·</span>
              <span
                className={
                  task.priority === 'high' && !subdued
                    ? 'font-medium text-orange-400'
                    : undefined
                }
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
            </>
          ) : null}
          <TaskDueDateLabel task={task} subdued={subdued || !isOpen} />
        </div>
      </button>
    </div>
  )
}
