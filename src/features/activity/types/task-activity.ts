export type TaskActivityKind =
  | 'task_created'
  | 'note'
  | 'task_assignee_changed'
  | 'task_completed'
  | 'task_reopened'
  | 'task_file_linked'
  | 'task_information_linked'

export type TaskActivityItem = {
  id: string
  kind: TaskActivityKind
  occurredAt: string
  actorName: string
  taskId: string
  taskTitle: string
  taskHref: string
  summary: string
}

export type TaskActivityCursor = {
  createdAt: string
  id: string
}

export type TaskActivityPage = {
  items: TaskActivityItem[]
  hasMore: boolean
  nextCursor: TaskActivityCursor | null
}

export type TaskActivityListState =
  | { status: 'ready'; items: TaskActivityItem[] }
  | { status: 'error'; message: string }

export type ActivityDateGroupKey = 'today' | 'yesterday' | string

export type ActivityListGroup = {
  key: ActivityDateGroupKey
  label: string
  items: TaskActivityItem[]
}

export type LoadMoreActivityResult =
  | ({ success: true } & TaskActivityPage)
  | { success: false; error: string }
