'use client'

import { useEffect, useId, useRef } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'

import { CloseIcon } from '@/components/app/app-icons'
import { attachTaskFileAction } from '@/features/tasks/actions/attach-task-file-action'
import {
  formatFileSize,
  formatMimeTypeLabel,
} from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileRecord } from '@/features/files/types/file'
import type { TaskRelationMutationState } from '@/features/tasks/types/task-relation'
import {
  aosCardEmptyClassName,
  aosDialogOverlayClassName,
  aosDialogPanelClassName,
  aosIconButtonClassName,
  aosPanelHeaderClassName,
  aosTextCardTitleClassName,
  aosTextMetaClassName,
} from '@/lib/design-system'

type TaskLinkFileDialogProps = {
  taskId: string
  availableFiles: FileRecord[]
  isOpen: boolean
  onClose: () => void
}

const initialState: TaskRelationMutationState = {}

export function TaskLinkFileDialog({
  taskId,
  availableFiles,
  isOpen,
  onClose,
}: TaskLinkFileDialogProps) {
  const router = useRouter()
  const titleId = useId()
  const [state, formAction, isPending] = useActionState(attachTaskFileAction, initialState)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [isOpen])

  useEffect(() => {
    if (state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      router.refresh()
      onClose()
    }
  }, [state.success, onClose, router])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dialog schließen"
        className={aosDialogOverlayClassName}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${aosDialogPanelClassName} relative z-10 max-h-[min(32rem,85vh)] max-w-lg`}
      >
        <div className={`${aosPanelHeaderClassName} flex items-start justify-between gap-3 px-5 py-4`}>
          <div>
            <h2 id={titleId} className={aosTextCardTitleClassName}>
              Datei verknüpfen
            </h2>
            <p className={`mt-1 ${aosTextMetaClassName}`}>
              Wählen Sie eine vorhandene Datei aus Ihrem Dateibereich.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={aosIconButtonClassName}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {availableFiles.length === 0 ? (
            <p className={`${aosCardEmptyClassName} border border-dashed px-4 py-6 text-sm text-zinc-500`}>
              Keine weiteren Dateien verfügbar.
            </p>
          ) : (
            <ul className="space-y-2">
              {availableFiles.map((file) => (
                <li key={file.id}>
                  <form action={formAction}>
                    <input type="hidden" name="taskId" value={taskId} />
                    <input type="hidden" name="fileId" value={file.id} />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full rounded-lg border border-zinc-200/70 px-3 py-2.5 text-left transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      <p className="truncate text-sm font-medium text-zinc-900">{file.filename}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatMimeTypeLabel(file.mime_type)} · {formatFileSize(file.size_bytes)} ·{' '}
                        {formatFileDateTime(file.created_at)}
                      </p>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {state.error ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
