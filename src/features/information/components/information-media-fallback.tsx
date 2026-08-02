'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { InformationAttachmentOpenButton } from '@/features/information/components/information-attachment-open-button'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceActionClassName, aosWorkspaceMetaClassName } from '@/lib/design-system'

type InformationMediaFallbackProps = {
  file: FileRecord
  message: string
}

export function InformationMediaFallback({ file, message }: InformationMediaFallbackProps) {
  const router = useRouter()

  const handleReload = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="rounded-md border border-dashed border-zinc-200/70 bg-zinc-50/50 px-3 py-4">
      <p className="text-[13px] font-medium text-zinc-700">{file.filename}</p>
      <p className={`mt-0.5 ${aosWorkspaceMetaClassName}`}>
        {formatFileSize(file.size_bytes)} · {message}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleReload} className={aosWorkspaceActionClassName}>
          Erneut laden
        </button>
        <InformationAttachmentOpenButton fileId={file.id} />
      </div>
    </div>
  )
}
