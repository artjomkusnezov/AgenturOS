'use client'

import { formatFileSize, formatMimeTypeLabel } from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileRecord } from '@/features/files/types/file'

type FileListItemProps = {
  file: FileRecord
  isSelected: boolean
  onSelect: (fileId: string) => void
}

export function FileListItem({ file, isSelected, onSelect }: FileListItemProps) {
  const metaLabel = `${formatMimeTypeLabel(file.mime_type)}, ${formatFileSize(file.size_bytes)}, erstellt am ${formatFileDateTime(file.created_at)}`

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`${file.filename}, ${metaLabel}`}
      onClick={() => onSelect(file.id)}
      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isSelected
          ? 'bg-white shadow-sm ring-1 ring-zinc-200/80'
          : 'hover:bg-white/70'
      }`}
    >
      <p className="truncate text-sm font-medium text-zinc-900" title={file.filename}>
        {file.filename}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-500" title={metaLabel}>
        {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Erstellt am {formatFileDateTime(file.created_at)}
      </p>
    </button>
  )
}
