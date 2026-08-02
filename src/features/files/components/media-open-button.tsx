'use client'

import { useActionState, useEffect, useRef } from 'react'

import type {
  MediaDownloadAction,
  MediaDownloadState,
} from '@/features/files/types/document-media'
import { aosWorkspaceActionClassName } from '@/lib/design-system'

const initialState: MediaDownloadState = {}

type MediaOpenButtonProps = {
  fileId: string
  action: MediaDownloadAction
  extraFields?: Record<string, string>
  label?: string
}

export function MediaOpenButton({
  fileId,
  action,
  extraFields,
  label = 'Öffnen',
}: MediaOpenButtonProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const handledUrlRef = useRef<string | null>(null)

  useEffect(() => {
    handledUrlRef.current = null
  }, [fileId])

  useEffect(() => {
    if (state.success && state.downloadUrl && handledUrlRef.current !== state.downloadUrl) {
      handledUrlRef.current = state.downloadUrl
      window.location.assign(state.downloadUrl)
    }
  }, [state.success, state.downloadUrl])

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="fileId" value={fileId} />
      {extraFields
        ? Object.entries(extraFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <button type="submit" disabled={isPending} className={aosWorkspaceActionClassName}>
        {isPending ? '…' : label}
      </button>
      {state.error ? (
        <p className="mt-0.5 text-[10px] leading-tight text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
