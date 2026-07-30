'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'

import { CloseIcon } from '@/components/app/app-icons'
import { saveUniversalCaptureAction } from '@/features/capture/actions/save-universal-capture'
import { CaptureFilePicker } from '@/features/capture/components/capture-file-picker'
import { getValidCaptureFiles } from '@/features/capture/lib/validate-capture'
import type { CaptureMutationState, CaptureQueueItem } from '@/features/capture/types/capture'

type UniversalCaptureDialogProps = {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const initialState: CaptureMutationState = {}

const textareaClassName =
  'min-h-[7rem] w-full resize-y rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

export function UniversalCaptureDialog({
  isOpen,
  onClose,
  triggerRef,
}: UniversalCaptureDialogProps) {
  const router = useRouter()
  const dialogTitleId = useId()
  const dialogDescriptionId = useId()
  const statusRegionId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const submittingRef = useRef(false)
  const handledSuccessRef = useRef<string | null>(null)
  const unmountedRef = useRef(false)

  const [content, setContent] = useState('')
  const [queueItems, setQueueItems] = useState<CaptureQueueItem[]>([])

  const [state, formAction, isPending] = useActionState(saveUniversalCaptureAction, initialState)

  const resetForm = useCallback(() => {
    setContent('')
    setQueueItems([])
    handledSuccessRef.current = null
  }, [])

  const handleClose = useCallback(() => {
    if (isPending) {
      return
    }

    resetForm()
    onClose()
  }, [isPending, onClose, resetForm])

  useEffect(() => {
    unmountedRef.current = false

    return () => {
      unmountedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const triggerElement = triggerRef.current
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      triggerElement?.focus()
    }
  }, [handleClose, isOpen, isPending, triggerRef])

  useEffect(() => {
    if (state.success && state.itemId && handledSuccessRef.current !== state.itemId) {
      handledSuccessRef.current = state.itemId
      router.refresh()

      if (!unmountedRef.current) {
        resetForm()
        onClose()
      }
    }
  }, [onClose, resetForm, router, state.itemId, state.success])

  const validFileCount = getValidCaptureFiles(queueItems.map((item) => item.file)).length
  const canSubmit = (content.trim().length > 0 || validFileCount > 0) && !isPending

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (submittingRef.current || isPending || !canSubmit) {
        event.preventDefault()
        return
      }

      submittingRef.current = true

      const form = event.currentTarget
      const formData = new FormData(form)

      formData.delete('files')
      getValidCaptureFiles(queueItems.map((item) => item.file)).forEach((file) => {
        formData.append('files', file)
      })

      formAction(formData)

      queueMicrotask(() => {
        submittingRef.current = false
      })
    },
    [canSubmit, formAction, isPending, queueItems]
  )

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
        disabled={isPending}
      />

      <div
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
            disabled={isPending}
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
                disabled={isPending}
                placeholder="Notiz, Idee oder schneller Eingang …"
                className={textareaClassName}
                aria-describedby={statusRegionId}
              />
              {state.fieldErrors?.content ? (
                <p className="text-sm text-red-600">{state.fieldErrors.content}</p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-900">Dateien</p>
              <CaptureFilePicker
                items={queueItems}
                onItemsChange={setQueueItems}
                disabled={isPending}
              />
              {state.fieldErrors?.files ? (
                <p className="mt-2 text-sm text-amber-700">{state.fieldErrors.files}</p>
              ) : null}
            </div>

            <div id={statusRegionId} role="status" aria-live="polite" className="space-y-2">
              {isPending ? (
                <p className="text-sm font-medium text-zinc-700">Wird im Eingang gespeichert …</p>
              ) : null}
              {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
              {state.success && state.failedFiles && state.failedFiles.length > 0 ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p>
                    Im Eingang gespeichert. {state.uploadedFileCount ?? 0} Datei
                    {(state.uploadedFileCount ?? 0) === 1 ? '' : 'en'} übernommen,{' '}
                    {state.failedFiles.length} fehlgeschlagen.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {state.failedFiles.map((failedFile) => (
                      <li key={`${failedFile.filename}-${failedFile.error}`}>
                        {failedFile.filename}: {failedFile.error}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-200/70 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {isPending ? 'Wird gespeichert …' : 'Im Eingang speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
