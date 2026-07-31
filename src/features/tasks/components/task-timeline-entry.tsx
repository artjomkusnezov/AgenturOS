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

  return (
    <article
      className={`rounded-lg border px-4 py-3 ${
        isSystem
          ? 'border-zinc-200/70 bg-zinc-50/80'
          : 'border-zinc-200/80 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">
          {isSystem ? 'Systemereignis' : authorName}
        </p>
        <time className="text-xs text-zinc-500" dateTime={entry.created_at}>
          {formatTaskDateTime(entry.created_at)}
        </time>
      </div>

      <p
        className={`mt-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isSystem ? 'text-zinc-600' : 'text-zinc-800'
        }`}
      >
        {entry.content}
      </p>
    </article>
  )
}
