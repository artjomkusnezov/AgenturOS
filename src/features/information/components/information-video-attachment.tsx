'use client'

import { useState } from 'react'

import { InformationAttachmentOpenButton } from '@/features/information/components/information-attachment-open-button'
import { InformationMediaFallback } from '@/features/information/components/information-media-fallback'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type InformationVideoAttachmentProps = {
  file: FileRecord
  mediaUrl: string | null
}

export function InformationVideoAttachment({
  file,
  mediaUrl,
}: InformationVideoAttachmentProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <InformationMediaFallback
        file={file}
        message={
          loadError
            ? 'Das Video konnte nicht geladen werden.'
            : 'Die Videoanzeige ist vorübergehend nicht verfügbar.'
        }
      />
    )
  }

  return (
    <figure className="space-y-2">
      <video
        key={mediaUrl}
        controls
        playsInline
        preload="metadata"
        src={mediaUrl}
        className="h-auto w-full max-w-full bg-zinc-900"
        onError={() => setLoadError(true)}
      >
        Ihr Browser unterstützt die Video-Wiedergabe nicht.
      </video>
      <figcaption className="flex items-center justify-between gap-2">
        <span className={`min-w-0 truncate ${aosWorkspaceMetaClassName}`} title={file.filename}>
          {file.filename} · {formatFileSize(file.size_bytes)}
        </span>
        <InformationAttachmentOpenButton fileId={file.id} />
      </figcaption>
    </figure>
  )
}
