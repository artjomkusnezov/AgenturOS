'use client'

import { FileListItem } from '@/features/files/components/file-list-item'
import type { FileRecord } from '@/features/files/types/file'

type FileListProps = {
  files: FileRecord[]
  selectedFileId: string | null
  onSelectFile: (fileId: string) => void
}

export function FileList({ files, selectedFileId, onSelectFile }: FileListProps) {
  return (
    <nav aria-label="Gespeicherte Dateien">
      <ul
        role="listbox"
        aria-label="Dateiliste"
        className="flex max-h-[min(32rem,calc(100vh-22rem))] flex-col gap-1 overflow-y-auto pr-1"
      >
        {files.map((file) => (
          <li key={file.id} role="presentation">
            <FileListItem
              file={file}
              isSelected={file.id === selectedFileId}
              onSelect={onSelectFile}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
