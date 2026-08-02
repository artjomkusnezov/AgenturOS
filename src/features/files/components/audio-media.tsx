'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { MediaFallback } from '@/features/files/components/media-fallback'
import { MediaOpenButton } from '@/features/files/components/media-open-button'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { MediaDownloadAction } from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type AudioMediaProps = {
  file: FileRecord
  mediaUrl: string | null
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
  captionActions?: ReactNode
}

export function AudioMedia({
  file,
  mediaUrl,
  openAction,
  openExtraFields,
  captionActions,
}: AudioMediaProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <MediaFallback
        file={file}
        message={
          loadError
            ? 'Die Audiodatei konnte nicht geladen werden.'
            : 'Die Audioanzeige ist vorübergehend nicht verfügbar.'
        }
        openAction={openAction}
        openExtraFields={openExtraFields}
      />
    )
  }

  return (
    <figure className="space-y-2">
      <audio
        key={mediaUrl}
        controls
        preload="metadata"
        src={mediaUrl}
        className="w-full"
        onError={() => setLoadError(true)}
      >
        Ihr Browser unterstützt die Audio-Wiedergabe nicht.
      </audio>
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
