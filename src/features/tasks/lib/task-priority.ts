import type { TaskPriority } from '@/features/tasks/types/task'

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high']

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
}

export function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority)
}

export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
}
