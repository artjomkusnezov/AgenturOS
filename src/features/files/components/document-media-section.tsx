'use client'

import type { ReactNode } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFile } from '@/features/dashboard/components/dashboard-icons'
import { AudioMedia } from '@/features/files/components/audio-media'
import { GenericAttachment } from '@/features/files/components/generic-attachment'
import { ImageMedia } from '@/features/files/components/image-media'
import { PdfMedia } from '@/features/files/components/pdf-media'
import { VideoMedia } from '@/features/files/components/video-media'
import {
  classifyMediaKind,
  isInlineDocumentMedia,
} from '@/features/files/lib/classify-media-kind'
import type {
  DocumentMediaItem,
  MediaDownloadAction,
} from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import {
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type DocumentMediaSectionProps = {
  items: DocumentMediaItem[]
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
  title?: string
  emptyLabel?: string
  trailing?: ReactNode
  renderFileActions?: (file: FileRecord) => ReactNode
}

function InlineMediaBlock({
  item,
  openAction,
  openExtraFields,
  captionActions,
}: {
  item: DocumentMediaItem
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
  captionActions?: ReactNode
}) {
  const { file, mediaUrl } = item

  if (!file) {
    return null
  }

  const kind = classifyMediaKind(file.mime_type, file.filename)

  switch (kind) {
    case 'image':
      return (
        <ImageMedia
          file={file}
          mediaUrl={mediaUrl}
          openAction={openAction}
          openExtraFields={openExtraFields}
          captionActions={captionActions}
        />
      )
    case 'pdf':
      return (
        <PdfMedia
          file={file}
          mediaUrl={mediaUrl}
          openAction={openAction}
          openExtraFields={openExtraFields}
          captionActions={captionActions}
        />
      )
    case 'audio':
      return (
        <AudioMedia
          file={file}
          mediaUrl={mediaUrl}
          openAction={openAction}
          openExtraFields={openExtraFields}
          captionActions={captionActions}
        />
      )
    case 'video':
      return (
        <VideoMedia
          file={file}
          mediaUrl={mediaUrl}
          openAction={openAction}
          openExtraFields={openExtraFields}
          captionActions={captionActions}
        />
      )
    default:
      return null
  }
}

export function DocumentMediaSection({
  items,
  openAction,
  openExtraFields,
  title = 'Anhänge',
  emptyLabel = 'Keine Anhänge',
  trailing,
  renderFileActions,
}: DocumentMediaSectionProps) {
  const inlineItems = items.filter(
    (item) =>
      item.file !== null && isInlineDocumentMedia(item.file.mime_type, item.file.filename),
  )

  const otherItems = items.filter(
    (item) =>
      item.file === null || !isInlineDocumentMedia(item.file.mime_type, item.file.filename),
  )

  const isEmpty = items.length === 0

  return (
    <section aria-label={title} className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title={title}
        accent="neutral"
        count={items.length}
        icon={<DashboardIconFile className="h-4 w-4" />}
        trailing={trailing}
      />

      {isEmpty ? (
        <p className={aosWorkspaceMetaClassName}>{emptyLabel}</p>
      ) : (
        <div className="space-y-5">
          {inlineItems.length > 0 ? (
            <div className="space-y-5" aria-label="Medien">
              {inlineItems.map((item) => (
                <div key={item.key}>
                  <InlineMediaBlock
                    item={item}
                    openAction={openAction}
                    openExtraFields={openExtraFields}
                    captionActions={
                      item.file && renderFileActions
                        ? renderFileActions(item.file)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {otherItems.length > 0 ? (
            <ul
              className={
                inlineItems.length > 0
                  ? 'divide-y divide-zinc-100 border-t border-zinc-200/40 pt-3'
                  : 'divide-y divide-zinc-100'
              }
              aria-label="Weitere Anhänge"
            >
              {otherItems.map((item) => (
                <GenericAttachment
                  key={item.key}
                  file={item.file}
                  openAction={openAction}
                  openExtraFields={openExtraFields}
                  actions={
                    item.file && renderFileActions
                      ? renderFileActions(item.file)
                      : undefined
                  }
                />
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  )
}
