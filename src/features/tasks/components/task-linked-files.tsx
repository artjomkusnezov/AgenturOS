'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { DocumentMediaSection } from '@/features/files/components/document-media-section'
import type { DocumentMediaItem } from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import { downloadTaskFileAction } from '@/features/tasks/actions/download-task-file-action'
import { detachTaskFileAction } from '@/features/tasks/actions/detach-task-file-action'
import { TaskLinkFileDialog } from '@/features/tasks/components/task-link-file-dialog'
import type {
  TaskLinkedFile,
  TaskRelationMutationState,
} from '@/features/tasks/types/task-relation'
import { aosWorkspaceActionClassName } from '@/lib/design-system'

type TaskLinkedFilesProps = {
  taskId: string
  linkedFiles: TaskLinkedFile[]
  availableFiles: FileRecord[]
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
        className={aosWorkspaceActionClassName}
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

function toMediaItems(linkedFiles: TaskLinkedFile[]): DocumentMediaItem[] {
  return linkedFiles.map((entry) => ({
    key: entry.relationId,
    file: entry.file,
    mediaUrl: entry.mediaUrl ?? null,
  }))
}

export function TaskLinkedFiles({
  taskId,
  linkedFiles,
  availableFiles,
}: TaskLinkedFilesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <DocumentMediaSection
        items={toMediaItems(linkedFiles)}
        openAction={downloadTaskFileAction}
        openExtraFields={{ taskId }}
        title="Dateien"
        emptyLabel="Noch keine Dateien verknüpft."
        trailing={
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className={aosWorkspaceActionClassName}
          >
            Verknüpfen
          </button>
        }
        renderFileActions={(file) => <DetachFileButton taskId={taskId} fileId={file.id} />}
      />

      <TaskLinkFileDialog
        taskId={taskId}
        availableFiles={availableFiles}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  )
}
