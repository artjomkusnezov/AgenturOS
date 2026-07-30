'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createContactAction } from '@/features/contacts/actions/create-contact'
import type { ContactMutationState } from '@/features/contacts/types/contact'

type CreateContactFormProps = {
  onCancel: () => void
  onCreated: (contactId: string) => void
}

const initialState: ContactMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

export function CreateContactForm({ onCancel, onCreated }: CreateContactFormProps) {
  const [state, formAction, isPending] = useActionState(createContactAction, initialState)
  const handledSuccessRef = useRef<string | null>(null)

  useEffect(() => {
    if (state.success && state.contactId && handledSuccessRef.current !== state.contactId) {
      handledSuccessRef.current = state.contactId
      onCreated(state.contactId)
    }
  }, [state.success, state.contactId, onCreated])

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white">
      <div className="border-b border-zinc-200/70 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Neuer Kontakt
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Erfassen Sie mindestens Vorname, Nachname oder Firma.
        </p>
      </div>

      <form action={formAction} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-first-name" className="text-sm font-medium text-zinc-900">
                Vorname
              </label>
              <input
                id="create-contact-first-name"
                name="firstName"
                type="text"
                maxLength={200}
                autoFocus
                disabled={isPending}
                placeholder="Vorname"
                className={inputClassName}
              />
              {state.fieldErrors?.firstName ? (
                <p className="text-sm text-red-600">{state.fieldErrors.firstName}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-last-name" className="text-sm font-medium text-zinc-900">
                Nachname
              </label>
              <input
                id="create-contact-last-name"
                name="lastName"
                type="text"
                maxLength={200}
                disabled={isPending}
                placeholder="Nachname"
                className={inputClassName}
              />
              {state.fieldErrors?.lastName ? (
                <p className="text-sm text-red-600">{state.fieldErrors.lastName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-contact-company" className="text-sm font-medium text-zinc-900">
              Firma
            </label>
            <input
              id="create-contact-company"
              name="company"
              type="text"
              maxLength={200}
              disabled={isPending}
              placeholder="Firma"
              className={inputClassName}
            />
            {state.fieldErrors?.company ? (
              <p className="text-sm text-red-600">{state.fieldErrors.company}</p>
            ) : null}
          </div>

          {state.fieldErrors?.identity ? (
            <p className="text-sm text-red-600">{state.fieldErrors.identity}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-email" className="text-sm font-medium text-zinc-900">
                E-Mail
                <span className="font-normal text-zinc-500"> (optional)</span>
              </label>
              <input
                id="create-contact-email"
                name="email"
                type="email"
                maxLength={200}
                disabled={isPending}
                placeholder="name@beispiel.de"
                className={inputClassName}
              />
              {state.fieldErrors?.email ? (
                <p className="text-sm text-red-600">{state.fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-phone" className="text-sm font-medium text-zinc-900">
                Telefon
                <span className="font-normal text-zinc-500"> (optional)</span>
              </label>
              <input
                id="create-contact-phone"
                name="phone"
                type="tel"
                maxLength={200}
                disabled={isPending}
                placeholder="+49 …"
                className={inputClassName}
              />
              {state.fieldErrors?.phone ? (
                <p className="text-sm text-red-600">{state.fieldErrors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="create-contact-notes" className="text-sm font-medium text-zinc-900">
              Notizen
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="create-contact-notes"
              name="notes"
              rows={6}
              disabled={isPending}
              placeholder="Weitere Informationen zum Kontakt …"
              className={`${inputClassName} min-h-[8rem] resize-y`}
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
            {isPending ? 'Wird erstellt …' : 'Kontakt erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
