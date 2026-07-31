import Link from 'next/link'

import {
  formatActivityTimestamp,
  getActivityDateGroupKey,
} from '@/features/activity/lib/format-activity-date'
import type { TaskActivityItem } from '@/features/activity/types/task-activity'

type ActivityListItemProps = {
  item: TaskActivityItem
}

function ActivityKindIcon({ kind }: { kind: TaskActivityItem['kind'] }) {
  if (kind === 'task_created') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path d="M9 11 11 13 15 9" />
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    )
  }

  if (kind === 'task_completed') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }

  if (kind === 'task_reopened') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path d="M4 12a8 8 0 0 1 13.3-6" />
        <path d="M17 4v4h-4" />
      </svg>
    )
  }

  if (kind === 'task_assignee_changed') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M4 19c0-2.2 2.2-4 5-4" />
        <path d="M16 11h5M18.5 8.5 21 11l-2.5 2.5" />
      </svg>
    )
  }

  if (kind === 'task_file_linked') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
      </svg>
    )
  }

  if (kind === 'task_information_linked') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 10v5M12 8h.01" />
      </svg>
    )
  }

  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M8 6h8M8 10h8M8 14h5" />
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

export function ActivityListItem({ item }: ActivityListItemProps) {
  const groupKey = getActivityDateGroupKey(item.occurredAt)
  const timestampLabel = formatActivityTimestamp(item.occurredAt, groupKey)

  return (
    <article className="flex gap-3 border-b border-zinc-100 py-3 last:border-b-0">
      <div className="mt-0.5 shrink-0 text-zinc-400" aria-hidden="true">
        <ActivityKindIcon kind={item.kind} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-zinc-800">{item.summary}</p>
        <p className="mt-1 text-xs text-zinc-500">{timestampLabel}</p>
        <Link
          href={item.taskHref}
          className="mt-2 inline-flex max-w-full rounded-md text-sm font-medium text-accent transition-colors duration-150 hover:text-accent/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="truncate">{item.taskTitle}</span>
        </Link>
      </div>
    </article>
  )
}
