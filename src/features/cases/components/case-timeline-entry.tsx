import { formatTaskDateTime } from '@/features/tasks/lib/task-status'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import type { CaseTimelineEntry } from '@/features/cases/types/case-timeline'
import {
  aosTimelineDotNoteClassName,
  aosTimelineDotSystemClassName,
  aosTimelineItemClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type CaseTimelineEntryProps = {
  entry: CaseTimelineEntry
  memberNameMap: Record<string, string>
}

export function CaseTimelineEntryView({
  entry,
  memberNameMap,
}: CaseTimelineEntryProps) {
  const authorName = resolveTaskMemberName(entry.created_by, memberNameMap)
  const isCreated = entry.event_type === 'created'

  if (isCreated) {
    return (
      <li className={aosTimelineItemClassName}>
        <div className={aosTimelineDotSystemClassName} aria-hidden="true" />
        <article className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-[13px] font-medium text-zinc-700">{entry.content}</p>
            <time className={aosWorkspaceMetaClassName} dateTime={entry.created_at}>
              {formatTaskDateTime(entry.created_at)}
            </time>
          </div>
        </article>
      </li>
    )
  }

  return (
    <li className={aosTimelineItemClassName}>
      <div className={aosTimelineDotNoteClassName} aria-hidden="true" />
      <article className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-[13px] font-semibold text-zinc-900">
            {authorName} hat eine Notiz hinzugefügt
          </p>
          <time className={aosWorkspaceMetaClassName} dateTime={entry.created_at}>
            {formatTaskDateTime(entry.created_at)}
          </time>
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap text-zinc-800">
          {entry.content}
        </p>
      </article>
    </li>
  )
}
