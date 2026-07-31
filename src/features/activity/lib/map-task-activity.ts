import {
  buildTaskActivitySummary,
  isVisibleTaskActivityEntry,
  resolveTaskActivityKind,
} from '@/features/activity/lib/task-activity-events'
import type { TaskActivityItem } from '@/features/activity/types/task-activity'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

export type TaskTimelineEntryWithTask = TaskTimelineEntry & {
  tasks: {
    title: string
  }
}

export function mapTaskTimelineEntryToActivity(
  entry: TaskTimelineEntryWithTask,
  memberNameMap: Record<string, string>,
): TaskActivityItem | null {
  if (!isVisibleTaskActivityEntry(entry)) {
    return null
  }

  const kind = resolveTaskActivityKind(entry)

  if (!kind) {
    return null
  }

  const actorName = resolveTaskMemberName(entry.author_user_id, memberNameMap)
  const taskTitle = entry.tasks.title.trim() || 'Unbenannter Vorgang'

  return {
    id: entry.id,
    kind,
    occurredAt: entry.created_at,
    actorName,
    taskId: entry.task_id,
    taskTitle,
    taskHref: `/app/tasks?task=${entry.task_id}`,
    summary: buildTaskActivitySummary(kind, actorName, taskTitle),
  }
}
