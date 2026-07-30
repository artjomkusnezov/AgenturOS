'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'

import { CloseIcon } from '@/components/app/app-icons'
import { createCaptureInboxAction } from '@/features/capture/actions/create-capture-inbox'
import { deleteCaptureInboxAction } from '@/features/capture/actions/delete-capture-inbox'
import { linkCaptureFileAction } from '@/features/capture/actions/link-capture-file'
import { CaptureFilePicker } from '@/features/capture/components/capture-file-picker'
import {
  getValidCaptureFiles,
  hasCaptureFieldErrors,
  validateCaptureInput,
} from '@/features/capture/lib/validate-capture'
import type {
  CaptureFieldErrors,
  CaptureQueueItem,
  CaptureUploadProgress,
} from '@/features/capture/types/capture'
import { uploadCaptureFileAction } from '@/features/capture/actions/upload-capture-file'

type UniversalCaptureDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const textareaClassName =
  'min-h-[7rem] w-full resize-y rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getPendingUploadItems(items: CaptureQueueItem[]): CaptureQueueItem[] {
  return items.filter((item) => item.status === 'queued' || item.status === 'error')
}

export function UniversalCaptureDialog({
  isOpen,
  onClose,
  triggerRef,
}: UniversalCaptureDialogProps) {
  const router = useRouter()
  const dialogTitleId = useId()
  const dialogDescriptionId = useId()
  const statusRegionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const processingRef = useRef(false)

  const [content, setContent] = useState('')
  const [queueItems, setQueueItems] = useState<CaptureQueueItem[]>([])
  const [inboxItemId, setInboxItemId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CaptureFieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<CaptureUploadProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasPartialSuccess, setHasPartialSuccess] = useState(false)

  const isUploading = uploadProgress !== null
  const isLocked = inboxItemId !== null

  const resetForm = useCallback(() => {
    setContent('')
    setQueueItems([])
    setInboxItemId(null)
    setFieldErrors({})
    setGlobalError(null)
    setUploadProgress(null)
    setHasPartialSuccess(false)
  }, [])

  const handleClose = useCallback(() => {
    if (isProcessing) {
      return
    }

    resetForm()
    onClose()
  }, [isProcessing, onClose, resetForm])

  const updateQueueItem = useCallback((clientId: string, update: Partial<CaptureQueueItem>) => {
    setQueueItems((previous) =>
      previous.map((item) => (item.clientId === clientId ? { ...item, ...update } : item))
    )
  }, [])

  const uploadSingleFile = useCallback(
    async (item: CaptureQueueItem, targetInboxId: string): Promise<boolean> => {
      updateQueueItem(item.clientId, { status: 'uploading', error: undefined })

      const formData = new FormData()
      formData.set('file', item.file)
      const uploadResult = await uploadCaptureFileAction(formData)

      if (!('success' in uploadResult) || !uploadResult.fileId) {
        const errorMessage =
          'fieldErrors' in uploadResult
            ? uploadResult.fieldErrors.file
            : 'error' in uploadResult
              ? uploadResult.error
              : 'Die Datei konnte nicht hochgeladen werden.'
        updateQueueItem(item.clientId, { status: 'error', error: errorMessage })
        return false
      }

      const linkResult = await linkCaptureFileAction(targetInboxId, uploadResult.fileId)

      if ('error' in linkResult) {
        updateQueueItem(item.clientId, {
          status: 'error',
          error: linkResult.error,
        })
        return false
      }

      updateQueueItem(item.clientId, {
        status: 'success',
        error: undefined,
        fileId: uploadResult.fileId,
      })
      return true
    },
    [updateQueueItem]
  )

  const uploadPendingFiles = useCallback(
    async (targetInboxId: string, items: CaptureQueueItem[]): Promise<{ successCount: number; errorCount: number }> => {
      let successCount = 0
      let errorCount = 0

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]

        setUploadProgress({
          current: index + 1,
          total: items.length,
          filename: item.file.name,
        })

        const succeeded = await uploadSingleFile(item, targetInboxId)

        if (succeeded) {
          successCount += 1
        } else {
          errorCount += 1
        }
      }

      setUploadProgress(null)
      return { successCount, errorCount }
    },
    [uploadSingleFile]
  )

  const finishWithSuccess = useCallback(() => {
    router.refresh()
    resetForm()
    onClose()
  }, [onClose, resetForm, router])

  const runCapture = useCallback(
    async (itemsToUpload: CaptureQueueItem[]) => {
      if (processingRef.current) {
        return
      }

      processingRef.current = true
      setIsProcessing(true)
      setGlobalError(null)

      try {
        let targetInboxId = inboxItemId

        if (!targetInboxId) {
          const validFiles = getValidCaptureFiles(itemsToUpload.map((item) => item.file))
          const inboxResult = await createCaptureInboxAction(
            content,
            validFiles.map((file) => file.name)
          )

          if ('error' in inboxResult) {
            setGlobalError(inboxResult.error)
            return
          }

          targetInboxId = inboxResult.itemId
          setInboxItemId(targetInboxId)
        }

        if (itemsToUpload.length === 0) {
          finishWithSuccess()
          return
        }

        const { successCount, errorCount } = await uploadPendingFiles(targetInboxId, itemsToUpload)

        if (successCount > 0) {
          router.refresh()
        }

        if (errorCount === 0) {
          finishWithSuccess()
          return
        }

        if (successCount === 0) {
          const deleteResult = await deleteCaptureInboxAction(targetInboxId)
          setInboxItemId(null)

          if ('error' in deleteResult) {
            setGlobalError(
              'Die Dateien konnten nicht gespeichert werden. Der Eingangseintrag konnte nicht entfernt werden.'
            )
            setHasPartialSuccess(true)
            return
          }

          setGlobalError(
            errorCount === 1
              ? 'Die Datei konnte nicht gespeichert werden.'
              : 'Die Dateien konnten nicht gespeichert werden.'
          )
          return
        }

        setHasPartialSuccess(true)
        setGlobalError(null)
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [content, finishWithSuccess, inboxItemId, router, uploadPendingFiles]
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (processingRef.current || isProcessing) {
        return
      }

      if (inboxItemId && hasPartialSuccess) {
        return
      }

      const errors = validateCaptureInput(
        content,
        queueItems.map((item) => item.file)
      )

      if (hasCaptureFieldErrors(errors)) {
        setFieldErrors(errors)
        return
      }

      setFieldErrors({})

      const pendingItems = getPendingUploadItems(queueItems)

      if (pendingItems.length === 0 && inboxItemId) {
        return
      }

      await runCapture(pendingItems.length > 0 ? pendingItems : queueItems)
    },
    [content, hasPartialSuccess, inboxItemId, isProcessing, queueItems, runCapture]
  )

  const handleRetry = useCallback(
    async (clientId: string) => {
      if (!inboxItemId || processingRef.current || isProcessing) {
        return
      }

      const item = queueItems.find((entry) => entry.clientId === clientId)

      if (!item || item.status !== 'error') {
        return
      }

      processingRef.current = true
      setIsProcessing(true)
      setGlobalError(null)

      try {
        setUploadProgress({ current: 1, total: 1, filename: item.file.name })
        const succeeded = await uploadSingleFile(item, inboxItemId)
        setUploadProgress(null)

        if (succeeded) {
        router.refresh()
        const hasRemainingErrors = queueItems.some(
          (entry) => entry.clientId !== clientId && entry.status === 'error'
        )

        if (!hasRemainingErrors) {
          finishWithSuccess()
        } else {
          setHasPartialSuccess(true)
        }
      }
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [finishWithSuccess, inboxItemId, isProcessing, queueItems, router, uploadSingleFile]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const panel = panelRef.current
    const triggerElement = triggerRef.current

    function getFocusableElements(): HTMLElement[] {
      if (!panel) {
        return []
      }

      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1
      )
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isProcessing) {
        event.preventDefault()
        handleClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    closeButtonRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      triggerElement?.focus()
    }
  }, [handleClose, isOpen, isProcessing, triggerRef])

  const validFileCount = getValidCaptureFiles(queueItems.map((item) => item.file)).length
  const pendingUploadCount = getPendingUploadItems(queueItems).length
  const successCount = queueItems.filter((item) => item.status === 'success').length
  const errorCount = queueItems.filter((item) => item.status === 'error').length
  const canSubmit =
    !isProcessing &&
    !hasPartialSuccess &&
    (content.trim().length > 0 || validFileCount > 0) &&
    pendingUploadCount > 0

  const canSubmitTextOnly =
    !isProcessing && !hasPartialSuccess && content.trim().length > 0 && validFileCount === 0

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Erfassung schließen"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={handleClose}
        disabled={isProcessing}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200/80 bg-white shadow-2xl ring-1 ring-zinc-200/60 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200/70 px-5 py-4">
          <div>
            <h2 id={dialogTitleId} className="text-base font-semibold tracking-tight text-zinc-900">
              Neu erfassen
            </h2>
            <p id={dialogDescriptionId} className="mt-1 text-sm text-zinc-500">
              Text eingeben oder Dateien hinzufügen – alles landet zunächst im Eingang.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Erfassung schließen"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            <CloseIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="capture-content" className="text-sm font-medium text-zinc-900">
                Text
              </label>
              <textarea
                id="capture-content"
                name="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                disabled={isProcessing || isLocked}
                placeholder="Notiz, Idee oder schneller Eingang …"
                className={textareaClassName}
                aria-describedby={statusRegionId}
              />
              {fieldErrors.content ? (
                <p className="text-sm text-red-600">{fieldErrors.content}</p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-900">Dateien</p>
              <CaptureFilePicker
                items={queueItems}
                onItemsChange={setQueueItems}
                isUploading={isUploading}
                onRetry={handleRetry}
                locked={isLocked}
              />
              {fieldErrors.files ? (
                <p className="mt-2 text-sm text-amber-700">{fieldErrors.files}</p>
              ) : null}
            </div>

            <div id={statusRegionId} role="status" aria-live="polite" className="space-y-2">
              {uploadProgress ? (
                <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900">
                    Datei {uploadProgress.current} von {uploadProgress.total}:{' '}
                    <span className="font-normal text-zinc-600">{uploadProgress.filename}</span>
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

              {isProcessing && !uploadProgress ? (
                <p className="text-sm font-medium text-zinc-700">Eingang wird vorbereitet …</p>
              ) : null}

              {globalError ? <p className="text-sm text-red-600">{globalError}</p> : null}

              {hasPartialSuccess && successCount > 0 ? (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {successCount} Datei{successCount === 1 ? '' : 'en'} im Eingang gespeichert.
                </div>
              ) : null}

              {hasPartialSuccess && errorCount > 0 ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {errorCount} Datei{errorCount === 1 ? '' : 'en'} fehlgeschlagen. Bitte „Erneut“
                  bei der betroffenen Datei verwenden.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-200/70 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {hasPartialSuccess ? 'Fertig' : 'Abbrechen'}
            </button>
            {!hasPartialSuccess ? (
              <button
                type="submit"
                disabled={!(canSubmit || canSubmitTextOnly) || isProcessing}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              >
                {isProcessing ? 'Wird gespeichert …' : 'Im Eingang speichern'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
