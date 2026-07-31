import type { FileRecord } from '@/features/files/types/file'
import type { InformationItem } from '@/features/information/types/information-item'
import type { Task } from '@/features/tasks/types/task'
import type { TaskLinkedFile, TaskLinkedInformation } from '@/features/tasks/types/task-relation'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

export type TaskDetailLoadState =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      task: Task
      timelineEntries: TaskTimelineEntry[]
      linkedFiles: TaskLinkedFile[]
      linkedInformation: TaskLinkedInformation[]
      availableFiles: FileRecord[]
      availableInformation: InformationItem[]
    }
