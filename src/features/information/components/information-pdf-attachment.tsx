'use client'

import { useState } from 'react'

import { InformationAttachmentOpenButton } from '@/features/information/components/information-attachment-open-button'
import { InformationMediaFallback } from '@/features/information/components/information-media-fallback'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type InformationPdfAttachmentProps = {
  file: FileRecord
  mediaUrl: string | null
}

export function InformationPdfAttachment({ file, mediaUrl }: InformationPdfAttachmentProps) {
  const [loadError, setLoadError] = useState(false)

  if (!mediaUrl || loadError) {
    return (
      <InformationMediaFallback
        file={file}
        message={
          loadError
            ? 'Das PDF konnte nicht geladen werden.'
            : 'Die PDF-Anzeige ist vorübergehend nicht verfügbar.'
        }
      />
    )
  }

  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-md border border-zinc-200/60 bg-zinc-50">
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
        <InformationAttachmentOpenButton fileId={file.id} />
      </figcaption>
    </figure>
  )
}
