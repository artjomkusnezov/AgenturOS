'use client'

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'

import { CaptureFileQueueItem } from '@/features/capture/components/capture-file-queue-item'
import type { CaptureQueueItem } from '@/features/capture/types/capture'
import { formatUploadLimitHint } from '@/features/files/lib/format-file-label'
import { getUploadFileValidationMessage } from '@/features/files/lib/validate-file'
import { getCaptureFileValidationMessage } from '@/features/capture/lib/validate-capture-file'

type CaptureFilePickerProps = {
  items: CaptureQueueItem[]
  onItemsChange: (items: CaptureQueueItem[]) => void
  isUploading: boolean
  onRetry: (clientId: string) => void
  locked: boolean
  validationMode?: 'capture' | 'full'
  enableDragDrop?: boolean
  enablePaste?: boolean
}

function createClientId(): string {
  return crypto.randomUUID()
}

function filesFromFileList(fileList: FileList): File[] {
  return Array.from(fileList)
}

function createQueueItem(file: File, error?: string): CaptureQueueItem {
  return {
    clientId: createClientId(),
    file,
    status: error ? 'error' : 'queued',
    error,
  }
}

export function CaptureFilePicker({
  items,
  onItemsChange,
  isUploading,
  onRetry,
  locked,
  validationMode = 'capture',
  enableDragDrop = true,
  enablePaste = true,
}: CaptureFilePickerProps) {
  const inputId = useId()
  const dropZoneId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const disabled = isUploading || locked

  const validateFile = useCallback(
    (file: File) => {
      if (validationMode === 'full') {
        return getUploadFileValidationMessage(file)
      }

      return getCaptureFileValidationMessage(file)
    },
    [validationMode],
  )

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0 || disabled) {
        return
      }

      const nextItems = [...items]

      for (const file of incoming) {
        const validationMessage = validateFile(file)
        nextItems.push(createQueueItem(file, validationMessage ?? undefined))
      }

      onItemsChange(nextItems)
    },
    [disabled, items, onItemsChange, validateFile],
  )

  const removeItem = useCallback(
    (clientId: string) => {
      if (disabled) {
        return
      }

      onItemsChange(items.filter((item) => item.clientId !== clientId && item.status !== 'success'))
    },
    [disabled, items, onItemsChange]
  )

  const clearItems = useCallback(() => {
    if (!disabled) {
      onItemsChange(items.filter((item) => item.status === 'success'))
    }
  }, [disabled, items, onItemsChange])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files

      if (selectedFiles && selectedFiles.length > 0) {
        addFiles(filesFromFileList(selectedFiles))
      }

      event.target.value = ''
    },
    [addFiles]
  )

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (disabled || !enableDragDrop) {
        return
      }

      dragCounterRef.current += 1
      setIsDragging(true)
    },
    [disabled, enableDragDrop],
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

      if (disabled || !enableDragDrop) {
        return
      }

      addFiles(filesFromFileList(event.dataTransfer.files))
    },
    [addFiles, disabled, enableDragDrop],
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (disabled || !enablePaste) {
        return
      }

      const clipboardItems = event.clipboardData?.items

      if (!clipboardItems || clipboardItems.length === 0) {
        return
      }

      const pastedFiles: File[] = []

      for (const item of clipboardItems) {
        if (item.kind !== 'file') {
          continue
        }

        const file = item.getAsFile()

        if (file) {
          pastedFiles.push(
            new File([file], file.name || `Screenshot-${Date.now()}.png`, {
              type: file.type || 'image/png',
            })
          )
        }
      }

      if (pastedFiles.length === 0) {
        return
      }

      event.preventDefault()
      addFiles(pastedFiles)
    },
    [addFiles, disabled, enablePaste],
  )

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const handleDropZoneKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openFileDialog()
      }
    },
    [openFileDialog]
  )

  const pendingCount = items.filter(
    (item) => item.status === 'queued' || item.status === 'error'
  ).length

  const dropZoneClassName = isDragging
    ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
    : 'border-zinc-300/80 bg-zinc-50/80 hover:border-zinc-400/80'

  const dropHint =
    validationMode === 'full'
      ? 'PDF, Bilder, Dokumente und weitere Dateien'
      : 'PDF, Bild oder Screenshot auswählen · Screenshot mit Strg+V einfügen'

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        multiple
        accept={validationMode === 'capture' ? 'image/*,application/pdf,.pdf' : undefined}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
      />

      {!locked ? (
        <div
          id={dropZoneId}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={
            enableDragDrop
              ? 'Dateien hinzufügen. Klicken, ziehen oder Screenshot einfügen.'
              : 'Dateien hinzufügen.'
          }
          aria-disabled={disabled}
          onClick={openFileDialog}
          onKeyDown={handleDropZoneKeyDown}
          onDragEnter={enableDragDrop ? handleDragEnter : undefined}
          onDragLeave={enableDragDrop ? handleDragLeave : undefined}
          onDragOver={enableDragDrop ? handleDragOver : undefined}
          onDrop={enableDragDrop ? handleDrop : undefined}
          onPaste={enablePaste ? handlePaste : undefined}
          className={`rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${dropZoneClassName} ${
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          }`}
        >
          <p className="text-sm font-medium text-zinc-800">
            {enableDragDrop && isDragging ? 'Dateien loslassen' : 'Dateien auswählen'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{dropHint}</p>
          <p className="mt-2 text-xs text-zinc-400">{formatUploadLimitHint()}</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Dateien ({items.length})
            </p>
            {!disabled && pendingCount > 0 ? (
              <button
                type="button"
                onClick={clearItems}
                className="text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Auswahl leeren
              </button>
            ) : null}
          </div>
          <ul className="max-h-40 space-y-2 overflow-y-auto pr-1" aria-label="Ausgewählte Dateien">
            {items.map((item) => (
              <CaptureFileQueueItem
                key={item.clientId}
                item={item}
                isUploading={isUploading}
                onRemove={removeItem}
                onRetry={onRetry}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
