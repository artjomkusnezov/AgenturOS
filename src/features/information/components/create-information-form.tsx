'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createInformationItemAction } from '@/features/information/actions/create-information-item'
import type { InformationMutationState } from '@/features/information/types/information-item'

type CreateInformationFormProps = {
  onCancel: () => void
  onCreated: (itemId: string) => void
}

const initialState: InformationMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

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
    <div className="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white">
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
            <label htmlFor="create-information-title" className="text-sm font-medium text-zinc-900">
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
              className={inputClassName}
            />
            {state.fieldErrors?.title ? (
              <p className="text-sm text-red-600">{state.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="create-information-content"
              className="text-sm font-medium text-zinc-900"
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
              className={`${inputClassName} min-h-[10rem] resize-y`}
            />
          </div>

          {state.error ? (
            <p className="text-sm text-red-600">{state.error}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200/70 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
          >
            {isPending ? 'Wird erstellt …' : 'Information erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
