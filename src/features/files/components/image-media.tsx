'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { MediaFallback } from '@/features/files/components/media-fallback'
import { MediaOpenButton } from '@/features/files/components/media-open-button'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { MediaDownloadAction } from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type ImageMediaProps = {
  file: FileRecord
  mediaUrl: string | null
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
  captionActions?: ReactNode
}

export function ImageMedia({
  file,
  mediaUrl,
  openAction,
  openExtraFields,
  captionActions,
}: ImageMediaProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <MediaFallback
        file={file}
        message={
          loadError
            ? 'Das Bild konnte nicht geladen werden.'
            : 'Die Bildvorschau ist vorübergehend nicht verfügbar.'
        }
        openAction={openAction}
        openExtraFields={openExtraFields}
      />
    )
  }

  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={mediaUrl}
        src={mediaUrl}
        alt={file.filename}
        className="h-auto w-full max-w-full object-contain"
        onError={() => setLoadError(true)}
      />
      <figcaption className="flex items-center justify-between gap-2">
        <span className={`min-w-0 truncate ${aosWorkspaceMetaClassName}`} title={file.filename}>
          {file.filename} · {formatFileSize(file.size_bytes)}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <MediaOpenButton fileId={file.id} action={openAction} extraFields={openExtraFields} />
          {captionActions}
        </div>
      </figcaption>
    </figure>
  )
}
