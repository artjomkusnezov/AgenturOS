'use client'

import { useActionState, useCallback, useEffect, useId, useRef, type ChangeEvent, type DragEvent } from 'react'

import { uploadFileAction } from '@/features/files/actions/upload-file'
import type { FileMutationState } from '@/features/files/types/file'

type FileUploadZoneProps = {
  onUploaded: (fileId: string) => void
}

const initialState: FileMutationState = {}

export function FileUploadZone({ onUploaded }: FileUploadZoneProps) {
  const formId = useId()
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const handledSuccessRef = useRef<string | null>(null)
  const [state, formAction, isPending] = useActionState(uploadFileAction, initialState)

  useEffect(() => {
    if (state.success && state.fileId && handledSuccessRef.current !== state.fileId) {
      handledSuccessRef.current = state.fileId
      onUploaded(state.fileId)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [state.success, state.fileId, onUploaded])

  const submitSelectedFile = useCallback((file: File) => {
    const formData = new FormData()
    formData.set('file', file)
    formAction(formData)
  }, [formAction])

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (file) {
        submitSelectedFile(file)
      }
    },
    [submitSelectedFile]
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const file = event.dataTransfer.files?.[0]

      if (file) {
        submitSelectedFile(file)
      }
    },
    [submitSelectedFile]
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="space-y-3">
      <form id={formId} ref={formRef} action={formAction} className="hidden">
        <input
          ref={fileInputRef}
          id={inputId}
          name="file"
          type="file"
          onChange={handleInputChange}
          disabled={isPending}
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openFileDialog}
          disabled={isPending}
          className="rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
        >
          {isPending ? 'Upload läuft …' : 'Datei hochladen'}
        </button>
        <p className="text-xs text-zinc-500">Maximal 50 MB pro Datei</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="rounded-xl border border-dashed border-zinc-300/80 bg-white/50 px-4 py-6 text-center transition-colors duration-150 hover:border-zinc-400/80"
      >
        <p className="text-sm font-medium text-zinc-700">Datei hier ablegen</p>
        <p className="mt-1 text-xs text-zinc-500">
          Oder den Upload-Button verwenden – eine Datei pro Vorgang.
        </p>
      </div>

      {state.fieldErrors?.file ? (
        <p className="text-sm text-red-600">{state.fieldErrors.file}</p>
      ) : null}
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-zinc-600">Datei wurde hochgeladen.</p>
      ) : null}
    </div>
  )
}
