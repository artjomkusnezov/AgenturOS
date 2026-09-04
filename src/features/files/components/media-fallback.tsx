'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { MediaOpenButton } from '@/features/files/components/media-open-button'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { MediaDownloadAction } from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceActionClassName, aosWorkspaceMetaClassName } from '@/lib/design-system'

type MediaFallbackProps = {
  file: FileRecord
  message: string
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
}

export function MediaFallback({
  file,
  message,
  openAction,
  openExtraFields,
}: MediaFallbackProps) {
  const router = useRouter()

  const handleReload = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-3 py-4">
      <p className="text-[13px] font-medium text-slate-100">{file.filename}</p>
      <p className={`mt-0.5 ${aosWorkspaceMetaClassName}`}>
        {formatFileSize(file.size_bytes)} · {message}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleReload} className={aosWorkspaceActionClassName}>
          Erneut laden
        </button>
        <MediaOpenButton fileId={file.id} action={openAction} extraFields={openExtraFields} />
      </div>
    </div>
  )
}
