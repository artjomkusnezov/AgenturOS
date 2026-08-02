'use client'

import { useState } from 'react'

import { InformationAttachmentOpenButton } from '@/features/information/components/information-attachment-open-button'
import { InformationMediaFallback } from '@/features/information/components/information-media-fallback'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type InformationImageAttachmentProps = {
  file: FileRecord
  mediaUrl: string | null
}

export function InformationImageAttachment({
  file,
  mediaUrl,
}: InformationImageAttachmentProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <InformationMediaFallback
        file={file}
        message={
          loadError
            ? 'Das Bild konnte nicht geladen werden.'
            : 'Die Bildvorschau ist vorübergehend nicht verfügbar.'
        }
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
        <InformationAttachmentOpenButton fileId={file.id} />
      </figcaption>
    </figure>
  )
}
