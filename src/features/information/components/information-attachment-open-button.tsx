'use client'

import { useActionState, useEffect, useRef } from 'react'

import { downloadFileAction } from '@/features/files/actions/download-file'
import type { FileMutationState } from '@/features/files/types/file'
import { aosWorkspaceActionClassName } from '@/lib/design-system'

const initialDownloadState: FileMutationState = {}

type InformationAttachmentOpenButtonProps = {
  fileId: string
  label?: string
}

export function InformationAttachmentOpenButton({
  fileId,
  label = 'Öffnen',
}: InformationAttachmentOpenButtonProps) {
  const [state, formAction, isPending] = useActionState(
    downloadFileAction,
    initialDownloadState,
  )
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
