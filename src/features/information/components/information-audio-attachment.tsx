'use client'

import { useState } from 'react'

import { InformationAttachmentOpenButton } from '@/features/information/components/information-attachment-open-button'
import { InformationMediaFallback } from '@/features/information/components/information-media-fallback'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type InformationAudioAttachmentProps = {
  file: FileRecord
  mediaUrl: string | null
}

export function InformationAudioAttachment({
  file,
  mediaUrl,
}: InformationAudioAttachmentProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <InformationMediaFallback
        file={file}
        message={
          loadError
            ? 'Die Audiodatei konnte nicht geladen werden.'
            : 'Die Audioanzeige ist vorübergehend nicht verfügbar.'
        }
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
        <InformationAttachmentOpenButton fileId={file.id} />
      </figcaption>
    </figure>
  )
}
