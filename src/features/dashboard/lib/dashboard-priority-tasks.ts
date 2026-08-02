import { getTodayDateString, isTaskOpen, isTaskOverdue } from '@/features/tasks/lib/task-status'
import type { Task } from '@/features/tasks/types/task'

function taskPriorityScore(task: Task, today: string): number {
  if (isTaskOverdue(task, today)) {
    return 0
  }

  if (task.due_date === today) {
    return 1
  }

  if (task.priority === 'high') {
    return 2
  }

  return 3
}

function comparePriorityTasks(a: Task, b: Task, today: string): number {
  const scoreDiff = taskPriorityScore(a, today) - taskPriorityScore(b, today)

  if (scoreDiff !== 0) {
    return scoreDiff
  }

  if (a.due_date && b.due_date && a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date)
  }

  if (a.due_date && !b.due_date) {
    return -1
  }

  if (!a.due_date && b.due_date) {
    return 1
  }

  return b.created_at.localeCompare(a.created_at)
}

export function countOverdueOpenTasks(tasks: Task[], today = getTodayDateString()): number {
  return tasks.filter((task) => isTaskOpen(task) && isTaskOverdue(task, today)).length
}

export function selectPriorityTasksForDashboard(tasks: Task[], limit = 5): Task[] {
  const today = getTodayDateString()

  return tasks
    .filter(isTaskOpen)
    .sort((a, b) => comparePriorityTasks(a, b, today))
    .slice(0, limit)
}
