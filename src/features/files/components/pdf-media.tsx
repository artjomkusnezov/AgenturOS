'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { MediaFallback } from '@/features/files/components/media-fallback'
import { MediaOpenButton } from '@/features/files/components/media-open-button'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { MediaDownloadAction } from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type PdfMediaProps = {
  file: FileRecord
  mediaUrl: string | null
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
  captionActions?: ReactNode
}

export function PdfMedia({
  file,
  mediaUrl,
  openAction,
  openExtraFields,
  captionActions,
}: PdfMediaProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <MediaFallback
        file={file}
        message={
          loadError
            ? 'Das PDF konnte nicht geladen werden.'
            : 'Die PDF-Anzeige ist vorübergehend nicht verfügbar.'
        }
        openAction={openAction}
        openExtraFields={openExtraFields}
      />
    )
  }

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
        <iframe
          key={mediaUrl}
          src={mediaUrl}
          title={file.filename}
          className="h-[min(32rem,70vh)] w-full border-0"
          onError={() => setLoadError(true)}
        />
      </div>
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
