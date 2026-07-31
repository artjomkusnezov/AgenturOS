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
import { aosBtnXsClassName, aosListContainerClassName } from '@/lib/design-system'

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
        className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-60"
      >
        {isPending ? '…' : 'Entfernen'}
      </button>
      {state.error ? (
        <p className="mt-0.5 text-[10px] leading-tight text-red-600" role="alert">
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
    <section aria-label="Dateien" className="flex flex-col gap-2 border-t border-zinc-200/70 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Dateien
          {linkedFiles.length > 0 ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-400">
              ({linkedFiles.length})
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className={aosBtnXsClassName}
        >
          Verknüpfen
        </button>
      </div>

      {linkedFiles.length === 0 ? (
        <p className="text-xs text-zinc-400">Noch keine Dateien verknüpft.</p>
      ) : (
        <ul className={aosListContainerClassName}>
          {linkedFiles.map(({ file }) => {
            const isSelected = selectedFileId === file.id

            return (
              <li key={file.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 transition-colors duration-150 ${
                    isSelected ? 'bg-accent/5' : 'hover:bg-zinc-50/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenFile(file.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className="min-w-0 flex-1 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                  >
                    <span className="block truncate text-sm text-zinc-900">{file.filename}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-400">
                      {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)} ·{' '}
                      {formatFileDateTime(file.created_at)}
                    </span>
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
