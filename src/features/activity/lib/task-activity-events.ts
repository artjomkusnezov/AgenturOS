import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import type { TaskActivityKind } from '@/features/activity/types/task-activity'

const VISIBLE_SYSTEM_EVENT_KEYS = new Set(['task.created'])

export function isVisibleTaskActivityEntry(entry: TaskTimelineEntry): boolean {
  if (entry.entry_type === 'note') {
    return true
  }

  if (entry.entry_type === 'system' && entry.event_key) {
    return VISIBLE_SYSTEM_EVENT_KEYS.has(entry.event_key)
  }

  return false
}

export function resolveTaskActivityKind(entry: TaskTimelineEntry): TaskActivityKind | null {
  if (entry.entry_type === 'note') {
    return 'note'
  }

  if (entry.entry_type === 'system' && entry.event_key === 'task.created') {
    return 'task_created'
  }

  return null
}

export function buildTaskActivitySummary(
  kind: TaskActivityKind,
  actorName: string,
  taskTitle: string,
): string {
  if (kind === 'task_created') {
    return `${actorName} hat den Vorgang „${taskTitle}“ erstellt.`
  }

  return `${actorName} hat im Vorgang „${taskTitle}“ eine neue Notiz geschrieben.`
}
