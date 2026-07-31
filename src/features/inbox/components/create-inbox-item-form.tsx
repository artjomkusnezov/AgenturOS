'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createInboxItemAction } from '@/features/inbox/actions/create-inbox-item'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosCardPanelClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
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
    <div className={`${aosCardPanelClassName} h-full`}>
      <div className="border-b border-zinc-200/70 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Neu erfassen
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Erfassen Sie Inhalt für den zentralen Eingang. Sie müssen noch nicht entscheiden, wofür
          er später verwendet wird.
        </p>
      </div>

      <form action={formAction} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="create-inbox-content" className={aosTextLabelClassName}>
              Inhalt
            </label>
            <textarea
              id="create-inbox-content"
              name="content"
              rows={10}
              required
              autoFocus
              disabled={isPending}
              placeholder="Was möchten Sie erfassen?"
              className={`${aosTextareaClassName} min-h-[12rem]`}
            />
            {state.fieldErrors?.content ? (
              <p className={aosFieldErrorSmClassName}>{state.fieldErrors.content}</p>
            ) : null}
          </div>

          {state.error ? (
            <p className={aosFieldErrorSmClassName}>{state.error}</p>
          ) : null}
        </div>

        <div className={`${aosPanelFooterClassName} flex items-center justify-end gap-2`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={aosBtnGhostLgClassName}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={aosBtnPrimaryLgClassName}
          >
            {isPending ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
