import { formatTaskDateTime } from '@/features/tasks/lib/task-status'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import {
  aosTimelineDotNoteClassName,
  aosTimelineDotSystemClassName,
  aosTimelineItemClassName,
  aosWorkspaceMetaClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
  aosWsTextSecondaryClassName,
} from '@/lib/design-system'

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
      <li className={aosTimelineItemClassName}>
        <div className={aosTimelineDotSystemClassName} aria-hidden="true" />
        <article className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className={`text-[11px] font-medium ${aosWsTextMetaClassName}`}>System</p>
            <time className={aosWorkspaceMetaClassName} dateTime={entry.created_at}>
              {formatTaskDateTime(entry.created_at)}
            </time>
          </div>
          <p className={`aos-ws-timeline-action mt-1 text-[13px] leading-relaxed ${aosWsTextSecondaryClassName}`}>
            {entry.content}
          </p>
        </article>
      </li>
    )
  }

  return (
    <li className={aosTimelineItemClassName}>
      <div className={aosTimelineDotNoteClassName} aria-hidden="true" />
      <article className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className={`aos-ws-timeline-person text-[13px] font-semibold ${aosWsTextSecondaryClassName}`}>
            {authorName}
          </p>
          <time className={aosWorkspaceMetaClassName} dateTime={entry.created_at}>
            {formatTaskDateTime(entry.created_at)}
          </time>
        </div>
        <p
          className={`aos-ws-timeline-body mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap ${aosWsTextPrimaryClassName}`}
        >
          {entry.content}
        </p>
      </article>
    </li>
  )
}
