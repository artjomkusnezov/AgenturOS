import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import type { TaskActivityKind } from '@/features/activity/types/task-activity'

export const VISIBLE_SYSTEM_EVENT_KEYS_LIST = [
  'task.created',
  'task.assignee_changed',
  'task.completed',
  'task.reopened',
  'task.file_linked',
  'task.information_linked',
] as const

const VISIBLE_SYSTEM_EVENT_KEYS = new Set<string>(VISIBLE_SYSTEM_EVENT_KEYS_LIST)

export function buildVisibleActivityFeedOrFilter(): string {
  const eventKeys = VISIBLE_SYSTEM_EVENT_KEYS_LIST.join(',')

  return `entry_type.eq.note,and(entry_type.eq.system,event_key.in.(${eventKeys}))`
}

const EVENT_KEY_TO_KIND: Record<string, TaskActivityKind> = {
  'task.created': 'task_created',
  'task.assignee_changed': 'task_assignee_changed',
  'task.completed': 'task_completed',
  'task.reopened': 'task_reopened',
  'task.file_linked': 'task_file_linked',
  'task.information_linked': 'task_information_linked',
}

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

  if (entry.entry_type === 'system' && entry.event_key) {
    return EVENT_KEY_TO_KIND[entry.event_key] ?? null
  }

  return null
}

export function buildTaskActivitySummary(
  kind: TaskActivityKind,
  actorName: string,
  taskTitle: string,
  storedContent?: string,
): string {
  if (kind === 'task_created') {
    return `${actorName} hat den Vorgang „${taskTitle}“ erstellt.`
  }

  if (kind === 'note') {
    return `${actorName} hat im Vorgang „${taskTitle}“ eine neue Notiz geschrieben.`
  }

  if (storedContent?.trim()) {
    return storedContent.trim()
  }

  return `${actorName} hat eine Änderung am Vorgang „${taskTitle}“ vorgenommen.`
}
