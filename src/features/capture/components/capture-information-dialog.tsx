'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { CaptureFilePicker } from '@/features/capture/components/capture-file-picker'
import { MAX_CAPTURE_FILES } from '@/features/capture/lib/capture-file-limits'
import { buildInformationUrlWithAttachmentNotice } from '@/features/capture/lib/information-capture-notice'
import type { CaptureQueueItem, CaptureUploadProgress } from '@/features/capture/types/capture'
import { deleteFileAction } from '@/features/files/actions/delete-file'
import { uploadFileAction } from '@/features/files/actions/upload-file'
import { getUploadFileValidationMessage } from '@/features/files/lib/validate-file'
import { attachInformationFileAction } from '@/features/information/actions/attach-information-file-action'
import { createInformationItemAction } from '@/features/information/actions/create-information-item'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosFieldErrorSmClassName,
  aosInputLgClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

type CaptureInformationDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  /** Focus the attachment drop zone (Datei quick action). */
  focusAttachments?: boolean
}

function getPendingItems(items: CaptureQueueItem[]): CaptureQueueItem[] {
  return items.filter((item) => item.status === 'queued' || item.status === 'error')
}

export function CaptureInformationDialog({
  isOpen,
  onClose,
  triggerRef,
  focusAttachments = false,
}: CaptureInformationDialogProps) {
  const router = useRouter()
  const processingRef = useRef(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [queueItems, setQueueItems] = useState<CaptureQueueItem[]>([])
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<CaptureUploadProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const updateQueueItem = useCallback((clientId: string, update: Partial<CaptureQueueItem>) => {
    setQueueItems((previous) =>
      previous.map((item) => (item.clientId === clientId ? { ...item, ...update } : item)),
    )
  }, [])

  const resetForm = useCallback(() => {
    setTitle('')
    setContent('')
    setQueueItems([])
    setFieldErrors({})
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

  const handleRetry = useCallback(
    (clientId: string) => {
      if (isProcessing) {
        return
      }

      setQueueItems((previous) =>
        previous.map((item) => {
          if (item.clientId !== clientId) {
            return item
          }

          const validationMessage = getUploadFileValidationMessage(item.file)

          return {
            ...item,
            status: validationMessage ? 'error' : 'queued',
            error: validationMessage ?? undefined,
          }
        }),
      )
    },
    [isProcessing],
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (processingRef.current || isProcessing) {
        return
      }

      const invalidQueued = queueItems.filter(
        (item) => (item.status === 'queued' || item.status === 'error') && item.error,
      )

      if (invalidQueued.length > 0) {
        setGlobalError('Bitte entfernen oder ersetzen Sie ungültige Dateien vor dem Speichern.')
        return
      }

      processingRef.current = true
      setIsProcessing(true)
      setFieldErrors({})
      setGlobalError(null)

      try {
        const formData = new FormData()
        formData.set('title', title)
        formData.set('content', content)

        const result = await createInformationItemAction({}, formData)

        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors)
          return
        }

        if (!result.success || !result.itemId) {
          setGlobalError(result.error ?? 'Die Information konnte nicht erstellt werden.')
          return
        }

        const itemId = result.itemId
        const pendingItems = getPendingItems(queueItems)
        const totalCount = pendingItems.length
        let attachedCount = 0

        for (let index = 0; index < pendingItems.length; index += 1) {
          const item = pendingItems[index]

          updateQueueItem(item.clientId, { status: 'uploading', error: undefined })
          setUploadProgress({
            current: index + 1,
            total: pendingItems.length,
            filename: item.file.name,
          })

          const uploadFormData = new FormData()
          uploadFormData.set('file', item.file)
          const uploadResult = await uploadFileAction({}, uploadFormData)

          if (!uploadResult.success || !uploadResult.fileId) {
            updateQueueItem(item.clientId, {
              status: 'error',
              error:
                uploadResult.error ??
                uploadResult.fieldErrors?.file ??
                'Upload fehlgeschlagen.',
            })
            continue
          }

          const attachFormData = new FormData()
          attachFormData.set('informationId', itemId)
          attachFormData.set('fileId', uploadResult.fileId)
          const attachResult = await attachInformationFileAction({}, attachFormData)

          if (!attachResult.success) {
            const rollbackFormData = new FormData()
            rollbackFormData.set('fileId', uploadResult.fileId)
            await deleteFileAction({}, rollbackFormData)

            updateQueueItem(item.clientId, {
              status: 'error',
              error: attachResult.error ?? 'Die Datei konnte nicht verknüpft werden.',
            })
            continue
          }

          attachedCount += 1
          updateQueueItem(item.clientId, {
            status: 'success',
            error: undefined,
            fileId: uploadResult.fileId,
          })
        }

        setUploadProgress(null)
        router.refresh()
        resetForm()
        onClose()
        router.push(buildInformationUrlWithAttachmentNotice(itemId, attachedCount, totalCount))
      } finally {
        processingRef.current = false
        setIsProcessing(false)
        setUploadProgress(null)
      }
    },
    [
      content,
      isProcessing,
      onClose,
      queueItems,
      resetForm,
      router,
      title,
      updateQueueItem,
    ],
  )

  const statusLabel = uploadProgress
    ? `Datei ${uploadProgress.current} von ${uploadProgress.total}: ${uploadProgress.filename}`
    : isProcessing
      ? 'Wird erstellt …'
      : null

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
        form="capture-information-form"
        disabled={isProcessing || !title.trim()}
        className={aosBtnPrimaryLgClassName}
      >
        {isProcessing ? 'Wird gespeichert …' : 'Speichern'}
      </button>
    </div>
  )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title="Neue Information"
      description="Titel, Inhalt und Anhänge in einem Vorgang erfassen."
      onClose={handleClose}
      closeDisabled={isProcessing}
      triggerRef={triggerRef}
      footer={footer}
    >
      <form
        id="capture-information-form"
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-information-title" className={aosTextLabelClassName}>
              Titel
            </label>
            <input
              id="capture-information-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isProcessing}
              autoFocus={!focusAttachments}
              maxLength={200}
              placeholder="Worum geht es?"
              className={aosInputLgClassName}
            />
            {fieldErrors.title ? <p className={aosFieldErrorSmClassName}>{fieldErrors.title}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="capture-information-content" className={aosTextLabelClassName}>
              Inhalt
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="capture-information-content"
              name="content"
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={isProcessing}
              placeholder="Details, Notizen oder Links …"
              className={`${aosTextareaClassName} min-h-[7rem]`}
            />
          </div>

          <div>
            <p className={`mb-2 ${aosTextLabelClassName}`}>
              Anhänge
              <span className="font-normal text-zinc-500"> (optional)</span>
            </p>
            <CaptureFilePicker
              items={queueItems}
              onItemsChange={setQueueItems}
              isUploading={isProcessing}
              onRetry={handleRetry}
              locked={false}
              validationMode="full"
              enableDragDrop
              enablePaste
              maxFiles={MAX_CAPTURE_FILES}
              focusDropZone={isOpen && focusAttachments}
            />
          </div>

          <div role="status" aria-live="polite" className="space-y-2">
            {statusLabel ? <p className="text-sm text-zinc-600">{statusLabel}</p> : null}
            {globalError ? <p className={aosFieldErrorSmClassName}>{globalError}</p> : null}
          </div>
        </div>
      </form>
    </CaptureDialogShell>
  )
}
