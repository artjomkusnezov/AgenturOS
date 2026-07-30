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
    <div className="flex flex-col gap-1 overflow-y-auto pr-1">
      {files.map((file) => (
        <FileListItem
          key={file.id}
          file={file}
          isSelected={file.id === selectedFileId}
          onSelect={onSelectFile}
        />
      ))}
    </div>
  )
}
