'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createInformationItemAction } from '@/features/information/actions/create-information-item'
import type { InformationMutationState } from '@/features/information/types/information-item'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosCardPanelClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
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
    <div className={`${aosCardPanelClassName} h-full`}>
      <div className="border-b border-zinc-200/70 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Neue Information
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Erfassen Sie Titel und optionalen Inhalt für dauerhaftes Wissen.
        </p>
      </div>

      <form action={formAction} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-information-title" className={aosTextLabelClassName}>
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
              placeholder="Worum geht es?"
              className={aosInputClassName}
            />
            {state.fieldErrors?.title ? (
              <p className={aosFieldErrorSmClassName}>{state.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="create-information-content"
              className={aosTextLabelClassName}
            >
              Inhalt
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="create-information-content"
              name="content"
              rows={8}
              disabled={isPending}
              placeholder="Details, Notizen, Links oder weiteres Wissen …"
              className={`${aosTextareaClassName} min-h-[10rem]`}
            />
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
            {isPending ? 'Wird erstellt …' : 'Information erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
