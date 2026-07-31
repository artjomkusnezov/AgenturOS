import { formatTaskDateTime } from '@/features/tasks/lib/task-status'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

type TaskTimelineEntryProps = {
  entry: TaskTimelineEntry
  memberNameMap: Record<string, string>
}

export function TaskTimelineEntryView({
  entry,
  memberNameMap,
}: TaskTimelineEntryProps) {
  const authorName = resolveTaskMemberName(entry.author_user_id, memberNameMap)
  const isSystem = entry.entry_type === 'system'

  if (isSystem) {
    return (
      <article className="relative">
        <div
          className="absolute -left-[calc(1rem+5px)] top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-300"
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            System
          </p>
          <time className="text-[11px] text-zinc-400" dateTime={entry.created_at}>
            {formatTaskDateTime(entry.created_at)}
          </time>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{entry.content}</p>
      </article>
    )
  }

  return (
    <article className="relative">
      <div
        className="absolute -left-[calc(1rem+6px)] top-2 h-2 w-2 rounded-full bg-accent/50"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-medium text-zinc-900">{authorName}</p>
        <time className="text-[11px] text-zinc-400" dateTime={entry.created_at}>
          {formatTaskDateTime(entry.created_at)}
        </time>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
        {entry.content}
      </p>
    </article>
  )
}
