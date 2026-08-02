'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import {
  DashboardIconCalendar,
  DashboardIconCheck,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import { getDisplayInitials } from '@/features/dashboard/lib/dashboard-format'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardMetaClassName } from '@/features/dashboard/lib/dashboard-surface'
import { completeTaskAction } from '@/features/tasks/actions/complete-task'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import {
  formatDueDateLabel,
  getTodayDateString,
  isTaskOpen,
  isTaskOverdue,
} from '@/features/tasks/lib/task-status'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

type DashboardPriorityTaskRowProps = {
  task: Task
  memberNameMap: Record<string, string>
}

const initialState: TaskMutationState = {}

function TaskCompleteControl({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(completeTaskAction, initialState)
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [taskId])

  useEffect(() => {
    if (wasPendingRef.current && !isPending && state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      router.refresh()
    }

    wasPendingRef.current = isPending
  }, [isPending, state.success, router])

  return (
    <form
      action={formAction}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => event.stopPropagation()}
      className="shrink-0"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Aufgabe erledigen"
        title="Erledigen"
        className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300/90 bg-white text-transparent transition-colors duration-150 hover:border-[var(--aos-color-soft-green)] hover:bg-[var(--aos-color-soft-green-bg)] hover:text-[var(--aos-color-soft-green)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      >
        {isPending ? (
          <span className="text-[10px] text-zinc-400">…</span>
        ) : (
          <DashboardIconCheck className="h-3 w-3" />
        )}
      </button>
      {state.error ? (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}

export function DashboardPriorityTaskRow({
  task,
  memberNameMap,
}: DashboardPriorityTaskRowProps) {
  const taskHref = `/app/tasks?task=${task.id}`
  const today = getTodayDateString()
  const overdue = isTaskOverdue(task, today)
  const dueToday = task.due_date === today
  const isHigh = task.priority === 'high'
  const assigneeName = resolveTaskMemberName(task.assignee_user_id, memberNameMap)
  const showAssignee =
    assigneeName !== 'Nicht zugewiesen' && assigneeName !== 'Unbekanntes Mitglied'
  const dueLabel = task.due_date
    ? formatDueDateLabel(task.due_date, today, isTaskOpen(task))
    : null
  const showDue = Boolean(dueLabel)

  const dueTone = overdue
    ? aosIconAccentDangerClassName
    : dueToday
      ? aosIconAccentOrangeClassName
      : 'text-zinc-500'

  return (
    <div className="flex items-start gap-2.5 rounded-xl px-1.5 py-2 transition-colors duration-150 hover:bg-zinc-50/70 sm:px-2">
      <TaskCompleteControl taskId={task.id} />
      <Link
        href={taskHref}
        className="group min-w-0 flex-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 group-hover:text-zinc-950">
          {task.title}
        </span>
        {isHigh || showDue ? (
          <span className={dashboardMetaClassName}>
            {isHigh ? (
              <span className={`inline-flex items-center gap-1 font-medium ${aosIconAccentDangerClassName}`}>
                <DashboardIconFlag className={dashboardMetaIconClassName} />
                Hoch
              </span>
            ) : null}
            {showDue && dueLabel ? (
              <span className={`inline-flex items-center gap-1 ${dueTone}`}>
                <DashboardIconCalendar className={dashboardMetaIconClassName} />
                {dueLabel}
              </span>
            ) : null}
          </span>
        ) : null}
      </Link>
      {showAssignee ? (
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600"
          title={assigneeName}
          aria-label={`Verantwortlich: ${assigneeName}`}
        >
          {getDisplayInitials(assigneeName)}
        </span>
      ) : null}
    </div>
  )
}
