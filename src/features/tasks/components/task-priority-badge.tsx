import { Badge } from '@/components/ui/badge'
import type { TaskPriority } from '@/features/tasks/types/task'
import { TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'

type TaskPriorityBadgeProps = {
  priority: TaskPriority
  subdued?: boolean
}

export function TaskPriorityBadge({ priority, subdued = false }: TaskPriorityBadgeProps) {
  const variant = subdued
    ? 'neutral-subdued'
    : priority === 'high'
      ? 'emphasis'
      : 'neutral'

  return <Badge variant={variant}>{TASK_PRIORITY_LABELS[priority]}</Badge>
}
