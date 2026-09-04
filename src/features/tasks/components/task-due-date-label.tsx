'use client'

import { useMemo } from 'react'

import {
  formatDueDateLabel,
  getTodayDateString,
  isTaskOpen,
  isTaskOverdue,
} from '@/features/tasks/lib/task-status'
import type { Task } from '@/features/tasks/types/task'

type TaskDueDateLabelProps = {
  task: Task
  subdued?: boolean
}

export function TaskDueDateLabel({ task, subdued = false }: TaskDueDateLabelProps) {
  const label = useMemo(() => {
    if (!task.due_date) {
      return null
    }

    const today = getTodayDateString()
    return formatDueDateLabel(task.due_date, today, isTaskOpen(task))
  }, [task])

  if (!label) {
    return null
  }

  const overdue = !subdued && isTaskOverdue(task)

  return (
    <span
      className={`text-[11px] ${
        overdue ? 'font-medium text-red-400' : subdued ? 'aos-ws-text-muted' : 'aos-ws-text-meta'
      }`}
    >
      {label}
    </span>
  )
}
