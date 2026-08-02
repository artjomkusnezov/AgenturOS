'use client'

import { ImageMedia } from '@/features/files/components/image-media'
import { PdfMedia } from '@/features/files/components/pdf-media'
import { GenericAttachment } from '@/features/files/components/generic-attachment'
import { downloadFileAction } from '@/features/files/actions/download-file'
import { classifyMediaKind } from '@/features/files/lib/classify-media-kind'
import { formatTaskDateTime } from '@/features/tasks/lib/task-status'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import type { CaseTimelineEntryView as CaseTimelineEntryModel } from '@/features/cases/types/case-timeline'
import {
  aosTimelineDotNoteClassName,
  aosTimelineDotSystemClassName,
  aosTimelineItemClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type CaseTimelineEntryProps = {
  entry: CaseTimelineEntryModel
  memberNameMap: Record<string, string>
}

function SystemEntry({
  entry,
  label,
}: {
  entry: CaseTimelineEntryModel
  label: string
}) {
  return (
    <li className={aosTimelineItemClassName}>
      <div className={aosTimelineDotSystemClassName} aria-hidden="true" />
      <article className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-[13px] font-medium text-zinc-700">{label}</p>
          <time className={aosWorkspaceMetaClassName} dateTime={entry.created_at}>
            {formatTaskDateTime(entry.created_at)}
          </time>
        </div>
      </article>
    </li>
  )
}

function AttachmentPreview({ entry }: { entry: CaseTimelineEntryModel }) {
  const file = entry.file

  if (!file) {
    return (
      <p className="mt-1.5 text-[13px] text-zinc-600">{entry.content}</p>
    )
  }

  const kind = classifyMediaKind(file.mime_type, file.filename)

  if (kind === 'image') {
    return (
      <div className="mt-2">
        <ImageMedia
          file={file}
          mediaUrl={entry.mediaUrl}
          openAction={downloadFileAction}
        />
      </div>
    )
  }

  if (kind === 'pdf') {
    return (
      <div className="mt-2">
        <PdfMedia
          file={file}
          mediaUrl={entry.mediaUrl}
          openAction={downloadFileAction}
        />
      </div>
    )
  }

  return (
    <div className="mt-2">
      <ul className="list-none">
        <GenericAttachment file={file} openAction={downloadFileAction} />
      </ul>
    </div>
  )
}

export function CaseTimelineEntryView({
  entry,
  memberNameMap,
}: CaseTimelineEntryProps) {
  const authorName = resolveTaskMemberName(entry.created_by, memberNameMap)

  if (entry.event_type === 'created') {
    return <SystemEntry entry={entry} label={entry.content} />
  }

  if (entry.event_type === 'task_created' || entry.event_type === 'task_completed') {
    return <SystemEntry entry={entry} label={entry.content} />
  }

  if (entry.event_type === 'attachment') {
    return (
      <li className={aosTimelineItemClassName}>
        <div className={aosTimelineDotNoteClassName} aria-hidden="true" />
        <article className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-[13px] font-semibold text-zinc-900">
              {authorName} hat eine Datei hinzugefügt
            </p>
            <time className={aosWorkspaceMetaClassName} dateTime={entry.created_at}>
              {formatTaskDateTime(entry.created_at)}
            </time>
          </div>
          <AttachmentPreview entry={entry} />
        </article>
      </li>
    )
  }

  return (
    <li className={aosTimelineItemClassName}>
      <div className={aosTimelineDotNoteClassName} aria-hidden="true" />
      <article className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-[13px] font-semibold text-zinc-900">{authorName}</p>
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
