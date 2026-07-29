import type { TaskPriority } from '@/features/tasks/types/task'
import { TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'

type TaskPriorityBadgeProps = {
  priority: TaskPriority
  subdued?: boolean
}

export function TaskPriorityBadge({ priority, subdued = false }: TaskPriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        subdued
          ? 'bg-zinc-100 text-zinc-500'
          : priority === 'high'
            ? 'bg-zinc-200/80 text-zinc-700'
            : 'bg-zinc-100 text-zinc-600'
      }`}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  )
}
