'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createInboxItemAction } from '@/features/inbox/actions/create-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosDocBodyClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceSurfaceClassName,
  aosWsTextMutedClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type CreateInboxItemFormProps = {
  onCancel: () => void
  onCreated: (itemId: string) => void
}

const initialState: InboxItemMutationState = {}

export function CreateInboxItemForm({ onCancel, onCreated }: CreateInboxItemFormProps) {
  const [state, formAction, isPending] = useActionState(createInboxItemAction, initialState)
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
        <h2 className={`text-[15px] font-semibold tracking-tight ${aosWsTextPrimaryClassName}`}>Neu erfassen</h2>
        <p className={`mt-1 text-[11px] ${aosWsTextMutedClassName}`}>
          Die Verwendung entscheiden Sie später.
        </p>
      </div>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col px-1 py-4">
          <label htmlFor="create-inbox-content" className="sr-only">
            Inhalt
          </label>
          <textarea
            id="create-inbox-content"
            name="content"
            rows={12}
            required
            autoFocus
            disabled={isPending}
            placeholder="Was möchten Sie erfassen?"
            className={`${aosDocBodyClassName} min-h-[14rem]`}
          />
          {state.fieldErrors?.content ? (
            <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.fieldErrors.content}</p>
          ) : null}
          {state.error ? <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.error}</p> : null}
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
            {isPending ? '…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
