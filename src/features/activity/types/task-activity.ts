export type TaskActivityKind = 'task_created' | 'note'

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

export type TaskActivityListState =
  | { status: 'ready'; items: TaskActivityItem[] }
  | { status: 'error'; message: string }

export type ActivityDateGroupKey = 'today' | 'yesterday' | string

export type ActivityListGroup = {
  key: ActivityDateGroupKey
  label: string
  items: TaskActivityItem[]
}
