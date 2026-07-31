import type { Task } from '@/features/tasks/types/task'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

export type TaskDetailLoadState =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; task: Task; timelineEntries: TaskTimelineEntry[] }
