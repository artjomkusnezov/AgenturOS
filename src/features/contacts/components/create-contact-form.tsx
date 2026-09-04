'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createContactAction } from '@/features/contacts/actions/create-contact'
import type { ContactMutationState } from '@/features/contacts/types/contact'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosCardPanelClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
  aosWsTextMutedClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type CreateContactFormProps = {
  onCancel: () => void
  onCreated: (contactId: string) => void
}

const initialState: ContactMutationState = {}

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
    <div className={`${aosCardPanelClassName} h-full`}>
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className={`text-sm font-semibold tracking-tight ${aosWsTextPrimaryClassName}`}>
          Neuer Kontakt
        </h2>
        <p className={`mt-1 text-xs ${aosWsTextMutedClassName}`}>
          Erfassen Sie mindestens Vorname, Nachname oder Firma.
        </p>
      </div>

      <form action={formAction} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-first-name" className={aosTextLabelClassName}>
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
                className={aosInputClassName}
              />
              {state.fieldErrors?.firstName ? (
                <p className={aosFieldErrorSmClassName}>{state.fieldErrors.firstName}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-last-name" className={aosTextLabelClassName}>
                Nachname
              </label>
              <input
                id="create-contact-last-name"
                name="lastName"
                type="text"
                maxLength={200}
                disabled={isPending}
                placeholder="Nachname"
                className={aosInputClassName}
              />
              {state.fieldErrors?.lastName ? (
                <p className={aosFieldErrorSmClassName}>{state.fieldErrors.lastName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-contact-company" className={aosTextLabelClassName}>
              Firma
            </label>
            <input
              id="create-contact-company"
              name="company"
              type="text"
              maxLength={200}
              disabled={isPending}
              placeholder="Firma"
              className={aosInputClassName}
            />
            {state.fieldErrors?.company ? (
              <p className={aosFieldErrorSmClassName}>{state.fieldErrors.company}</p>
            ) : null}
          </div>

          {state.fieldErrors?.identity ? (
            <p className={aosFieldErrorSmClassName}>{state.fieldErrors.identity}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-email" className={aosTextLabelClassName}>
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
                className={aosInputClassName}
              />
              {state.fieldErrors?.email ? (
                <p className={aosFieldErrorSmClassName}>{state.fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-contact-phone" className={aosTextLabelClassName}>
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
                className={aosInputClassName}
              />
              {state.fieldErrors?.phone ? (
                <p className={aosFieldErrorSmClassName}>{state.fieldErrors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="create-contact-notes" className={aosTextLabelClassName}>
              Notizen
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="create-contact-notes"
              name="notes"
              rows={6}
              disabled={isPending}
              placeholder="Weitere Informationen zum Kontakt …"
              className={`${aosTextareaClassName} min-h-[8rem]`}
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
            {isPending ? 'Wird erstellt …' : 'Kontakt erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
