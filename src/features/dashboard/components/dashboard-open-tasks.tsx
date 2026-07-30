import Link from 'next/link'
import { memo } from 'react'

import {
  DashboardPanel,
  DashboardPanelEmpty,
} from '@/features/dashboard/components/dashboard-panel'
import { sanitizeDashboardLabel } from '@/features/dashboard/lib/dashboard-safe-data'
import { TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import {
  formatDueDateLabel,
  getTodayDateString,
  isTaskOpen,
  isTaskOverdue,
} from '@/features/tasks/lib/task-status'
import type { Task } from '@/features/tasks/types/task'

type DashboardOpenTasksProps = {
  tasks: Task[]
}

const TaskMeta = memo(function TaskMeta({ task }: { task: Task }) {
  const today = getTodayDateString()
  const isOpen = isTaskOpen(task)
  const overdue = isOpen && isTaskOverdue(task, today)
  const priorityLabel = TASK_PRIORITY_LABELS[task.priority] ?? 'Normal'

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">{priorityLabel}</span>
      {task.due_date ? (
        <span
          className={`text-xs ${
            overdue ? 'font-medium text-red-600' : 'text-zinc-500'
          }`}
        >
          {formatDueDateLabel(task.due_date, today, isOpen)}
        </span>
      ) : null}
    </div>
  )
})

export function DashboardOpenTasks({ tasks }: DashboardOpenTasksProps) {
  const previewTasks = tasks.slice(0, 5)

  return (
    <DashboardPanel
      title="Offene Aufgaben"
      headingId="dashboard-open-tasks-heading"
      href={tasks.length > 0 ? '/app/tasks' : undefined}
    >
      {previewTasks.length === 0 ? (
        <DashboardPanelEmpty
          title="Keine offenen Aufgaben"
          description="Sobald Aufgaben anstehen, erscheinen sie hier zur schnellen Weiterarbeit."
        />
      ) : (
        <ul className="divide-y divide-zinc-200/70 overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
          {previewTasks.map((task) => {
            const title = sanitizeDashboardLabel(task.title, 'Ohne Titel')

            return (
              <li key={task.id}>
                <Link
                  href={`/app/tasks?taskId=${task.id}`}
                  aria-label={`Aufgabe öffnen: ${title}`}
                  className="block px-4 py-3.5 transition-colors duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent active:bg-zinc-100/80"
                >
                  <p className="truncate text-sm font-medium text-zinc-900" title={title}>
                    {title}
                  </p>
                  <TaskMeta task={task} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardPanel>
  )
}
