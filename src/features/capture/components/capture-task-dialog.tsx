'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { attachTaskFileAction } from '@/features/tasks/actions/attach-task-file-action'
import { createTaskAction } from '@/features/tasks/actions/create-task'
import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { CaptureFilePicker } from '@/features/capture/components/capture-file-picker'
import { uploadFileAction } from '@/features/files/actions/upload-file'
import { buildTaskUrlWithAttachmentNotice } from '@/features/capture/lib/task-capture-notice'
import type { CaptureQueueItem, CaptureUploadProgress } from '@/features/capture/types/capture'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosFieldErrorSmClassName,
  aosInputLgClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

type CaptureTaskDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

function getPendingItems(items: CaptureQueueItem[]): CaptureQueueItem[] {
  return items.filter((item) => item.status === 'queued' || item.status === 'error')
}

export function CaptureTaskDialog({ isOpen, onClose, triggerRef }: CaptureTaskDialogProps) {
  const router = useRouter()
  const processingRef = useRef(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [queueItems, setQueueItems] = useState<CaptureQueueItem[]>([])
  const [titleError, setTitleError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<CaptureUploadProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setQueueItems([])
    setTitleError(null)
    setGlobalError(null)
    setUploadProgress(null)
  }, [])

  const handleClose = useCallback(() => {
    if (isProcessing) {
      return
    }

    resetForm()
    onClose()
  }, [isProcessing, onClose, resetForm])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (processingRef.current || isProcessing) {
        return
      }

      const trimmedTitle = title.trim()

      if (!trimmedTitle) {
        setTitleError('Bitte geben Sie einen Titel ein.')
        return
      }

      setTitleError(null)
      setGlobalError(null)
      processingRef.current = true
      setIsProcessing(true)

      try {
        const formData = new FormData()
        formData.set('title', trimmedTitle)
        formData.set('description', description)

        const createResult = await createTaskAction({}, formData)

        if (createResult.fieldErrors?.title) {
          setTitleError(createResult.fieldErrors.title)
          return
        }

        if (!createResult.success || !createResult.taskId) {
          setGlobalError(createResult.error ?? 'Die Aufgabe konnte nicht erstellt werden.')
          return
        }

        const taskId = createResult.taskId
        const pendingItems = getPendingItems(queueItems)
        const totalCount = pendingItems.length
        let attachedCount = 0

        for (let index = 0; index < pendingItems.length; index += 1) {
          const item = pendingItems[index]

          setUploadProgress({
            current: index + 1,
            total: pendingItems.length,
            filename: item.file.name,
          })

          const uploadFormData = new FormData()
          uploadFormData.set('file', item.file)
          const uploadResult = await uploadFileAction({}, uploadFormData)

          if (!uploadResult.success || !uploadResult.fileId) {
            continue
          }

          const attachFormData = new FormData()
          attachFormData.set('taskId', taskId)
          attachFormData.set('fileId', uploadResult.fileId)
          const attachResult = await attachTaskFileAction({}, attachFormData)

          if (attachResult.success) {
            attachedCount += 1
          }
        }

        setUploadProgress(null)
        router.refresh()
        resetForm()
        onClose()
        router.push(buildTaskUrlWithAttachmentNotice(taskId, attachedCount, totalCount))
      } finally {
        processingRef.current = false
        setIsProcessing(false)
        setUploadProgress(null)
      }
    },
    [description, isProcessing, onClose, queueItems, resetForm, router, title],
  )

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={handleClose}
        disabled={isProcessing}
        className={aosBtnGhostLgClassName}
      >
        Abbrechen
      </button>
      <button
        type="submit"
        form="capture-task-form"
        disabled={isProcessing || !title.trim()}
        className={aosBtnPrimaryLgClassName}
      >
        {isProcessing ? 'Wird erstellt …' : 'Aufgabe erstellen'}
      </button>
    </div>
  )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title="Neue Aufgabe"
      description="Titel und optional Beschreibung erfassen. Dateien können direkt angehängt werden."
      onClose={handleClose}
      closeDisabled={isProcessing}
      triggerRef={triggerRef}
      footer={footer}
    >
      <form id="capture-task-form" onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-task-title" className={aosTextLabelClassName}>
              Titel
            </label>
            <input
              id="capture-task-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isProcessing}
              autoFocus
              placeholder="Was soll erledigt werden?"
              className={aosInputLgClassName}
            />
            {titleError ? <p className={aosFieldErrorSmClassName}>{titleError}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-task-description" className={aosTextLabelClassName}>
              Beschreibung
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="capture-task-description"
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isProcessing}
              placeholder="Weitere Details …"
              className={`${aosTextareaClassName} min-h-[5rem]`}
            />
          </div>

          <div>
            <p className={`mb-2 ${aosTextLabelClassName}`}>
              Dateien
              <span className="font-normal text-zinc-500"> (optional)</span>
            </p>
            <CaptureFilePicker
              items={queueItems}
              onItemsChange={setQueueItems}
              isUploading={uploadProgress !== null}
              onRetry={() => undefined}
              locked={false}
              validationMode="full"
            />
          </div>

          <div role="status" aria-live="polite" className="space-y-2">
            {uploadProgress ? (
              <p className="text-sm text-zinc-600">
                Datei {uploadProgress.current} von {uploadProgress.total}: {uploadProgress.filename}
              </p>
            ) : null}
            {globalError ? <p className={aosFieldErrorSmClassName}>{globalError}</p> : null}
          </div>
        </div>
      </form>
    </CaptureDialogShell>
  )
}
