'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'

import { uploadFileAction } from '@/features/files/actions/upload-file'
import { FileUploadQueueItem } from '@/features/files/components/file-upload-queue-item'
import { formatUploadLimitHint } from '@/features/files/lib/format-file-label'
import { getUploadFileValidationMessage } from '@/features/files/lib/validate-file'
import type { PendingUploadItem } from '@/features/files/types/file'
import { createClientId } from '@/lib/create-client-id'

type FileUploadZoneProps = {
  onUploaded: (fileId: string) => void
}

function filesFromFileList(fileList: FileList): File[] {
  return Array.from(fileList)
}

function createQueueItem(file: File): PendingUploadItem {
  return {
    clientId: createClientId(),
    file,
    status: 'queued',
  }
}

export function FileUploadZone({ onUploaded }: FileUploadZoneProps) {
  const router = useRouter()
  const inputId = useId()
  const dropZoneId = useId()
  const statusRegionId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const abortedRef = useRef(false)
  const uploadingRef = useRef(false)

  const [isDragging, setIsDragging] = useState(false)
  const [queue, setQueue] = useState<PendingUploadItem[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const isUploading = uploadProgress !== null

  useEffect(() => {
    return () => {
      abortedRef.current = true
    }
  }, [])

  const updateQueueItem = useCallback(
    (clientId: string, update: Partial<PendingUploadItem>) => {
      setQueue((previous) =>
        previous.map((item) =>
          item.clientId === clientId ? { ...item, ...update } : item
        )
      )
    },
    []
  )

  const addFilesToQueue = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0 || isUploading) {
        return
      }

      const newItems: PendingUploadItem[] = []
      const validationMessages: string[] = []

      for (const file of incoming) {
        const validationMessage = getUploadFileValidationMessage(file)

        if (validationMessage) {
          validationMessages.push(`${file.name}: ${validationMessage}`)
          continue
        }

        newItems.push(createQueueItem(file))
      }

      if (newItems.length > 0) {
        setQueue((previous) => [...previous, ...newItems])
      }

      if (validationMessages.length > 0) {
        setStatusMessage(validationMessages.join(' · '))
      } else if (newItems.length > 0) {
        setStatusMessage(
          newItems.length === 1
            ? '1 Datei zur Upload-Warteschlange hinzugefügt.'
            : `${newItems.length} Dateien zur Upload-Warteschlange hinzugefügt.`
        )
      }
    },
    [isUploading]
  )

  const removeFromQueue = useCallback(
    (clientId: string) => {
      if (isUploading) {
        return
      }

      setQueue((previous) => previous.filter((item) => item.clientId !== clientId))
    },
    [isUploading]
  )

  const clearSuccessfulFromQueue = useCallback(() => {
    setQueue((previous) => previous.filter((item) => item.status !== 'success'))
  }, [])

  const uploadItems = useCallback(
    async (items: PendingUploadItem[]) => {
      if (items.length === 0 || uploadingRef.current) {
        return
      }

      uploadingRef.current = true
      abortedRef.current = false
      setUploadProgress({ current: 0, total: items.length })
      setStatusMessage(null)

      let successCount = 0
      let errorCount = 0
      let lastSuccessId: string | null = null

      for (let index = 0; index < items.length; index += 1) {
        if (abortedRef.current) {
          break
        }

        const item = items[index]

        updateQueueItem(item.clientId, { status: 'uploading', error: undefined })
        setUploadProgress({ current: index + 1, total: items.length })

        const formData = new FormData()
        formData.set('file', item.file)
        const result = await uploadFileAction({}, formData)

        if (abortedRef.current) {
          break
        }

        if (result.success && result.fileId) {
          successCount += 1
          lastSuccessId = result.fileId
          updateQueueItem(item.clientId, { status: 'success', error: undefined })
        } else {
          errorCount += 1
          const errorMessage =
            result.fieldErrors?.file ?? result.error ?? 'Die Datei konnte nicht hochgeladen werden.'
          updateQueueItem(item.clientId, { status: 'error', error: errorMessage })
        }
      }

      uploadingRef.current = false
      setUploadProgress(null)

      if (successCount > 0) {
        router.refresh()

        if (lastSuccessId) {
          onUploaded(lastSuccessId)
        }
      }

      if (errorCount === 0 && successCount > 0) {
        setStatusMessage(
          successCount === 1
            ? '1 Datei erfolgreich hochgeladen.'
            : `${successCount} Dateien erfolgreich hochgeladen.`
        )
        clearSuccessfulFromQueue()
      } else if (errorCount > 0 && successCount > 0) {
        setStatusMessage(
          `${successCount} hochgeladen, ${errorCount} fehlgeschlagen. Fehlerhafte Dateien können erneut versucht werden.`
        )
        clearSuccessfulFromQueue()
      } else if (errorCount > 0) {
        setStatusMessage(
          errorCount === 1
            ? '1 Upload fehlgeschlagen. Bitte erneut versuchen.'
            : `${errorCount} Uploads fehlgeschlagen. Bitte erneut versuchen.`
        )
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [clearSuccessfulFromQueue, onUploaded, router, updateQueueItem]
  )

  const startUpload = useCallback(async () => {
    const pendingItems = queue.filter(
      (item) => item.status === 'queued' || item.status === 'error'
    )

    await uploadItems(pendingItems)
  }, [queue, uploadItems])

  const retryUpload = useCallback(
    async (clientId: string) => {
      const item = queue.find((entry) => entry.clientId === clientId)

      if (!item || item.status !== 'error' || isUploading) {
        return
      }

      await uploadItems([item])
    },
    [isUploading, queue, uploadItems]
  )

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files

      if (selectedFiles && selectedFiles.length > 0) {
        addFilesToQueue(filesFromFileList(selectedFiles))
      }
    },
    [addFilesToQueue]
  )

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (isUploading) {
        return
      }

      dragCounterRef.current += 1
      setIsDragging(true)
    },
    [isUploading]
  )

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    dragCounterRef.current -= 1

    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragCounterRef.current = 0
      setIsDragging(false)

      if (isUploading) {
        return
      }

      addFilesToQueue(filesFromFileList(event.dataTransfer.files))
    },
    [addFilesToQueue, isUploading]
  )

  const openFileDialog = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }, [isUploading])

  const handleDropZoneKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openFileDialog()
      }
    },
    [openFileDialog]
  )

  const pendingCount = queue.filter(
    (item) => item.status === 'queued' || item.status === 'error'
  ).length

  const dropZoneClassName = isDragging
    ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
    : 'border-zinc-300/80 bg-white/50 hover:border-zinc-400/80 hover:bg-white/80'

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        id={inputId}
        name="file"
        type="file"
        multiple
        onChange={handleInputChange}
        disabled={isUploading}
        className="sr-only"
        aria-describedby={statusRegionId}
      />

      <div
        id={dropZoneId}
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label="Dateien hochladen. Klicken oder Dateien hier ablegen."
        aria-disabled={isUploading}
        aria-describedby={statusRegionId}
        onClick={openFileDialog}
        onKeyDown={handleDropZoneKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${dropZoneClassName} ${
          isUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        }`}
      >
        <p className="text-sm font-semibold text-zinc-800">
          {isDragging ? 'Dateien loslassen zum Hochladen' : 'Dateien hier ablegen'}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          oder klicken, um Dateien auszuwählen
        </p>
        <p className="mt-3 text-xs text-zinc-400">{formatUploadLimitHint()}</p>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Ausgewählte Dateien ({queue.length})
            </h3>
            {!isUploading && pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Auswahl leeren
              </button>
            ) : null}
          </div>

          <ul
            className="max-h-56 space-y-2 overflow-y-auto pr-1"
            aria-label="Upload-Warteschlange"
          >
            {queue.map((item) => (
              <FileUploadQueueItem
                key={item.clientId}
                item={item}
                isUploading={isUploading}
                onRemove={removeFromQueue}
                onRetry={retryUpload}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {isUploading && uploadProgress ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3"
        >
          <p className="text-sm font-medium text-zinc-900">
            Upload läuft … ({uploadProgress.current} von {uploadProgress.total})
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{
                width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {pendingCount > 0 && !isUploading ? (
        <button
          type="button"
          onClick={startUpload}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
        >
          {pendingCount === 1 ? '1 Datei hochladen' : `${pendingCount} Dateien hochladen`}
        </button>
      ) : null}

      <div id={statusRegionId} role="status" aria-live="polite" className="min-h-[1.25rem]">
        {statusMessage ? (
          <p
            className={`text-sm ${
              statusMessage.includes('fehlgeschlagen') || statusMessage.includes(':')
                ? 'text-red-600'
                : 'text-zinc-600'
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}
