'use client'

import { formatFileSize, formatMimeTypeLabel } from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileRecord } from '@/features/files/types/file'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListSelectedClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

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
      className={`${aosListRowClassName} flex-col items-stretch gap-0.5 ${
        isSelected ? aosListSelectedClassName : aosListRowHoverClassName
      } w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      <p
        className={`truncate text-[13px] font-medium leading-snug ${aosWsTextPrimaryClassName}`}
        title={file.filename}
      >
        {file.filename}
      </p>
      <p className={`mt-0.5 truncate text-[11px] leading-none ${aosWsTextMetaClassName}`} title={metaLabel}>
        {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)}
      </p>
      <p className={`mt-1 truncate text-[11px] leading-none ${aosWsTextMetaClassName}`}>
        Erstellt am {formatFileDateTime(file.created_at)}
      </p>
    </button>
  )
}
