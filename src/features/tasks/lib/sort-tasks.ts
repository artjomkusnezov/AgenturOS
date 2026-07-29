import { TASK_PRIORITY_ORDER } from '@/features/tasks/lib/task-priority'
import type { Task } from '@/features/tasks/types/task'
import { getTodayDateString, isTaskOpen, isTaskOverdue } from '@/features/tasks/lib/task-status'

export function sortOpenTasks(tasks: Task[]): Task[] {
  const today = getTodayDateString()

  return [...tasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a, today)
    const bOverdue = isTaskOverdue(b, today)

    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1
    }

    const aHasDue = a.due_date !== null
    const bHasDue = b.due_date !== null

    if (aHasDue !== bHasDue) {
      return aHasDue ? -1 : 1
    }

    const priorityDiff =
      TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority]

    if (priorityDiff !== 0) {
      return priorityDiff
    }

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

export function sortCompletedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aCompleted = a.completed_at ? new Date(a.completed_at).getTime() : 0
    const bCompleted = b.completed_at ? new Date(b.completed_at).getTime() : 0

    return bCompleted - aCompleted
  })
}

export function partitionAndSortTasks(tasks: Task[]): {
  openTasks: Task[]
  completedTasks: Task[]
} {
  const openTasks = tasks.filter(isTaskOpen)
  const completedTasks = tasks.filter((task) => !isTaskOpen(task))

  return {
    openTasks: sortOpenTasks(openTasks),
    completedTasks: sortCompletedTasks(completedTasks),
  }
}
