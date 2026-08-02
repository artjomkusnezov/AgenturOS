'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createInformationItemAction } from '@/features/information/actions/create-information-item'
import type { InformationMutationState } from '@/features/information/types/information-item'
import {
  aosDocBodyClassName,
  aosDocTitleClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceSurfaceClassName,
} from '@/lib/design-system'

type CreateInformationFormProps = {
  onCancel: () => void
  onCreated: (itemId: string) => void
}

const initialState: InformationMutationState = {}

export function CreateInformationForm({ onCancel, onCreated }: CreateInformationFormProps) {
  const [state, formAction, isPending] = useActionState(createInformationItemAction, initialState)
  const handledSuccessRef = useRef<string | null>(null)

  useEffect(() => {
    if (state.success && state.itemId && handledSuccessRef.current !== state.itemId) {
      handledSuccessRef.current = state.itemId
      onCreated(state.itemId)
    }
  }, [state.success, state.itemId, onCreated])

  return (
    <div className={`${aosWorkspaceSurfaceClassName} min-h-[24rem] lg:min-h-0`}>
      <div className={aosPanelHeaderClassName}>
        <p className="text-[11px] text-zinc-400">Neue Information</p>
      </div>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-4 px-1 py-4">
          <div>
            <label htmlFor="create-information-title" className="sr-only">
              Titel
            </label>
            <input
              id="create-information-title"
              name="title"
              type="text"
              required
              maxLength={200}
              autoFocus
              disabled={isPending}
              placeholder="Titel"
              className={aosDocTitleClassName}
            />
            {state.fieldErrors?.title ? (
              <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col">
            <label htmlFor="create-information-content" className="sr-only">
              Inhalt (optional)
            </label>
            <textarea
              id="create-information-content"
              name="content"
              rows={10}
              disabled={isPending}
              placeholder="Details, Notizen, Links oder weiteres Wissen …"
              className={`${aosDocBodyClassName} min-h-[12rem]`}
            />
          </div>

          {state.error ? <p className={aosFieldErrorSmClassName}>{state.error}</p> : null}
        </div>

        <div className={`${aosPanelFooterClassName} flex items-center justify-end gap-2`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={aosWorkspaceActionClassName}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={aosWorkspaceActionEmphasisClassName}
          >
            {isPending ? '…' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
