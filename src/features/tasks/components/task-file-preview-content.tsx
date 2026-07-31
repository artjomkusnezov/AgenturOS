'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  formatFileSize,
  formatMimeTypeLabel,
} from '@/features/files/lib/format-file-label'
import { getTaskFilePreviewMode } from '@/features/tasks/lib/task-file-preview'
import type { FileRecord } from '@/features/files/types/file'

type TaskFilePreviewContentProps = {
  file: FileRecord
  previewUrl: string
}

export function TaskFilePreviewContent({
  file,
  previewUrl,
}: TaskFilePreviewContentProps) {
  const router = useRouter()
  const [loadError, setLoadError] = useState(false)
  const previewMode = getTaskFilePreviewMode(file.mime_type)

  const handleReload = useCallback(() => {
    setLoadError(false)
    router.refresh()
  }, [router])

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center">
        <p className="max-w-md text-sm text-zinc-600">
          Die Vorschau konnte nicht geladen werden. Der Zugriff ist möglicherweise abgelaufen.
        </p>
        <button
          type="button"
          onClick={handleReload}
          className="rounded-xl border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50"
        >
          Erneut laden
        </button>
      </div>
    )
  }

  if (previewMode === 'pdf') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <iframe
          key={previewUrl}
          src={previewUrl}
          title={`PDF-Vorschau: ${file.filename}`}
          className="min-h-[28rem] w-full flex-1 border-0 bg-zinc-100"
          onError={() => setLoadError(true)}
        />
      </div>
    )
  }

  if (previewMode === 'image') {
    return (
      <div className="flex min-h-0 flex-1 overflow-auto p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={previewUrl}
          src={previewUrl}
          alt={file.filename}
          className="mx-auto max-h-full max-w-full object-contain"
          onError={() => setLoadError(true)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center">
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium text-zinc-900">{file.filename}</p>
        <p className="text-xs text-zinc-500">
          {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)}
        </p>
        <p className="text-sm text-zinc-600">
          Für diesen Dateityp ist keine Vorschau verfügbar.
        </p>
      </div>
      <a
        href={previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
      >
        Datei herunterladen
      </a>
    </div>
  )
}
