import Link from 'next/link'

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

function TaskMeta({ task }: { task: Task }) {
  const today = getTodayDateString()
  const isOpen = isTaskOpen(task)
  const overdue = isOpen && isTaskOverdue(task, today)

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">{TASK_PRIORITY_LABELS[task.priority]}</span>
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
}

export function DashboardOpenTasks({ tasks }: DashboardOpenTasksProps) {
  const previewTasks = tasks.slice(0, 5)

  return (
    <section aria-labelledby="dashboard-open-tasks-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="dashboard-open-tasks-heading"
          className="text-sm font-semibold tracking-tight text-zinc-900"
        >
          Offene Aufgaben
        </h2>
        {tasks.length > 0 ? (
          <Link
            href="/app/tasks"
            className="text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900"
          >
            Alle anzeigen
          </Link>
        ) : null}
      </div>

      {previewTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200/80 bg-white/50 px-4 py-5 text-sm text-zinc-500">
          Keine offenen Aufgaben.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200/70 overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
          {previewTasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/app/tasks?taskId=${task.id}`}
                className="block px-4 py-3 transition-colors duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <p className="truncate text-sm font-medium text-zinc-900">{task.title}</p>
                <TaskMeta task={task} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
