'use client'

import { TaskFilePreviewContent } from '@/features/tasks/components/task-file-preview-content'
import { TaskFilePreviewHeader } from '@/features/tasks/components/task-file-preview-header'
import type { FileRecord } from '@/features/files/types/file'

type TaskFilePreviewProps = {
  file: FileRecord
  previewUrl: string
  onClose: () => void
}

export function TaskFilePreview({
  file,
  previewUrl,
  onClose,
}: TaskFilePreviewProps) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-zinc-200/60 bg-white lg:min-h-0">
      <TaskFilePreviewHeader
        file={file}
        previewUrl={previewUrl}
        onClose={onClose}
      />
      <TaskFilePreviewContent file={file} previewUrl={previewUrl} />
    </div>
  )
}
