'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { createInformationItemAction } from '@/features/information/actions/create-information-item'
import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
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
}

export function CaptureInformationDialog({
  isOpen,
  onClose,
  triggerRef,
}: CaptureInformationDialogProps) {
  const router = useRouter()
  const processingRef = useRef(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const resetForm = useCallback(() => {
    setTitle('')
    setContent('')
    setFieldErrors({})
    setGlobalError(null)
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

        router.refresh()
        resetForm()
        onClose()
        router.push('/app/information')
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [content, isProcessing, onClose, resetForm, router, title],
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
        form="capture-information-form"
        disabled={isProcessing || !title.trim()}
        className={aosBtnPrimaryLgClassName}
      >
        {isProcessing ? 'Wird erstellt …' : 'Information erstellen'}
      </button>
    </div>
  )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title="Neue Information"
      description="Titel und optionalen Inhalt für dauerhaftes Wissen erfassen."
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
              autoFocus
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

          {globalError ? <p className={aosFieldErrorSmClassName}>{globalError}</p> : null}
        </div>
      </form>
    </CaptureDialogShell>
  )
}
