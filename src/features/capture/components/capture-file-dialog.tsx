'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { uploadFileAction } from '@/features/files/actions/upload-file'
import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { CaptureFilePicker } from '@/features/capture/components/capture-file-picker'
import type { CaptureQueueItem, CaptureUploadProgress } from '@/features/capture/types/capture'

type CaptureFileDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

function getPendingItems(items: CaptureQueueItem[]): CaptureQueueItem[] {
  return items.filter((item) => item.status === 'queued' || item.status === 'error')
}

export function CaptureFileDialog({ isOpen, onClose, triggerRef }: CaptureFileDialogProps) {
  const router = useRouter()
  const processingRef = useRef(false)
  const [queueItems, setQueueItems] = useState<CaptureQueueItem[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<CaptureUploadProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const updateQueueItem = useCallback((clientId: string, update: Partial<CaptureQueueItem>) => {
    setQueueItems((previous) =>
      previous.map((item) => (item.clientId === clientId ? { ...item, ...update } : item)),
    )
  }, [])

  const resetForm = useCallback(() => {
    setQueueItems([])
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

  const uploadPendingFiles = useCallback(async () => {
    const pendingItems = getPendingItems(queueItems)

    if (pendingItems.length === 0) {
      setGlobalError('Bitte wählen Sie mindestens eine Datei aus.')
      return
    }

    if (processingRef.current || isProcessing) {
      return
    }

    processingRef.current = true
    setIsProcessing(true)
    setGlobalError(null)

    let successCount = 0
    let errorCount = 0

    try {
      for (let index = 0; index < pendingItems.length; index += 1) {
        const item = pendingItems[index]

        updateQueueItem(item.clientId, { status: 'uploading', error: undefined })
        setUploadProgress({
          current: index + 1,
          total: pendingItems.length,
          filename: item.file.name,
        })

        const formData = new FormData()
        formData.set('file', item.file)
        const result = await uploadFileAction({}, formData)

        if (!result.success) {
          errorCount += 1
          updateQueueItem(item.clientId, {
            status: 'error',
            error: result.error ?? result.fieldErrors?.file ?? 'Upload fehlgeschlagen.',
          })
          continue
        }

        successCount += 1
        updateQueueItem(item.clientId, { status: 'success', error: undefined })
      }

      if (successCount > 0) {
        router.refresh()
      }

      if (errorCount === 0) {
        resetForm()
        onClose()
        router.push('/app/files')
        return
      }

      setGlobalError(
        errorCount === 1
          ? 'Eine Datei konnte nicht hochgeladen werden.'
          : `${errorCount} Dateien konnten nicht hochgeladen werden.`,
      )
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      setUploadProgress(null)
    }
  }, [isProcessing, onClose, queueItems, resetForm, router, updateQueueItem])

  const pendingCount = getPendingItems(queueItems).length

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={handleClose}
        disabled={isProcessing}
        className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 disabled:opacity-60"
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={uploadPendingFiles}
        disabled={isProcessing || pendingCount === 0}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
      >
        {isProcessing
          ? 'Wird hochgeladen …'
          : pendingCount <= 1
            ? 'Datei hochladen'
            : `${pendingCount} Dateien hochladen`}
      </button>
    </div>
  )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title="Datei hochladen"
      description="Dateien direkt in den Dateibereich hochladen."
      onClose={handleClose}
      closeDisabled={isProcessing}
      triggerRef={triggerRef}
      footer={footer}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <CaptureFilePicker
          items={queueItems}
          onItemsChange={setQueueItems}
          isUploading={uploadProgress !== null}
          onRetry={() => undefined}
          locked={false}
          validationMode="full"
          enableDragDrop
          enablePaste={false}
        />

        <div role="status" aria-live="polite" className="mt-4 space-y-2">
          {uploadProgress ? (
            <p className="text-sm text-zinc-600">
              Datei {uploadProgress.current} von {uploadProgress.total}: {uploadProgress.filename}
            </p>
          ) : null}
          {globalError ? <p className="text-sm text-red-600">{globalError}</p> : null}
        </div>
      </div>
    </CaptureDialogShell>
  )
}
