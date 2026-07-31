'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { detachTaskFileAction } from '@/features/tasks/actions/detach-task-file-action'
import { TaskLinkFileDialog } from '@/features/tasks/components/task-link-file-dialog'
import {
  formatFileSize,
  formatMimeTypeLabel,
} from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileRecord } from '@/features/files/types/file'
import type {
  TaskLinkedFile,
  TaskRelationMutationState,
} from '@/features/tasks/types/task-relation'

type TaskLinkedFilesProps = {
  taskId: string
  linkedFiles: TaskLinkedFile[]
  availableFiles: FileRecord[]
  selectedFileId?: string | null
  onOpenFile: (fileId: string) => void
}

const initialState: TaskRelationMutationState = {}

function DetachFileButton({ taskId, fileId }: { taskId: string; fileId: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(detachTaskFileAction, initialState)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [taskId, fileId])

  useEffect(() => {
    if (state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      router.refresh()
    }
  }, [state.success, router])

  return (
    <form
      action={formAction}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => event.stopPropagation()}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="fileId" value={fileId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Verknüpfung entfernen"
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
      >
        {isPending ? '…' : 'Entfernen'}
      </button>
      {state.error ? (
        <p className="mt-1 max-w-24 text-[10px] leading-tight text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}

export function TaskLinkedFiles({
  taskId,
  linkedFiles,
  availableFiles,
  selectedFileId = null,
  onOpenFile,
}: TaskLinkedFilesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <section aria-label="Dateien" className="flex flex-col gap-3 border-t border-zinc-200/70 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">Dateien</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Verknüpfte Dateien aus dem Dateibereich; es werden keine Kopien erstellt.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="shrink-0 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50"
        >
          Datei verknüpfen
        </button>
      </div>

      {linkedFiles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200/80 bg-zinc-50/50 px-4 py-4 text-sm text-zinc-500">
          Noch keine Dateien verknüpft.
        </p>
      ) : (
        <ul className="space-y-2">
          {linkedFiles.map(({ file }) => {
            const isSelected = selectedFileId === file.id

            return (
              <li key={file.id}>
                <div
                  className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
                    isSelected
                      ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                      : 'border-zinc-200/70 bg-white hover:border-zinc-300 hover:bg-zinc-50/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenFile(file.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className="min-w-0 flex-1 rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <p className="truncate text-sm font-medium text-zinc-900">{file.filename}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)} ·{' '}
                      {formatFileDateTime(file.created_at)}
                    </p>
                  </button>
                  <DetachFileButton taskId={taskId} fileId={file.id} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TaskLinkFileDialog
        taskId={taskId}
        availableFiles={availableFiles}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  )
}
