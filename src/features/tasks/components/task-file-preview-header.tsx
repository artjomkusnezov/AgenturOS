'use client'

import {
  formatFileSize,
  formatMimeTypeLabel,
} from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileRecord } from '@/features/files/types/file'

type TaskFilePreviewHeaderProps = {
  file: FileRecord
  previewUrl: string
  onClose: () => void
}

export function TaskFilePreviewHeader({
  file,
  previewUrl,
  onClose,
}: TaskFilePreviewHeaderProps) {
  return (
    <div className="border-b border-zinc-200/70 px-5 py-4">
      <button
        type="button"
        onClick={onClose}
        className="mb-3 inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900"
      >
        ← Zurück zum Vorgang
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-900">
            {file.filename}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)} ·{' '}
            {formatFileDateTime(file.created_at)}
          </p>
        </div>

        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50"
        >
          Herunterladen
        </a>
      </div>
    </div>
  )
}
