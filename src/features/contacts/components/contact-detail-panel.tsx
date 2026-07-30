'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteContactAction } from '@/features/contacts/actions/delete-contact'
import { updateContactAction } from '@/features/contacts/actions/update-contact'
import { formatContactListLabel } from '@/features/contacts/lib/format-contact-label'
import { formatContactDateTime } from '@/features/contacts/lib/contact-status'
import type { Contact, ContactMutationState } from '@/features/contacts/types/contact'

type ContactDetailPanelProps = {
  contact: Contact
  onBack?: () => void
  onDeleted: () => void
}

const initialState: ContactMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

export function ContactDetailPanel({
  contact,
  onBack,
  onDeleted,
}: ContactDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateContactAction,
    initialState
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteContactAction,
    initialState
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handledDeleteRef = useRef(false)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  const isPending = isUpdatePending || isDeletePending

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white">
      <div className="border-b border-zinc-200/70 px-5 py-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 lg:hidden"
          >
            ← Zurück zur Liste
          </button>
        ) : null}
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Kontakt bearbeiten
        </h2>
        <p className="mt-1 text-sm text-zinc-700">{formatContactListLabel(contact)}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Zuletzt geändert am {formatContactDateTime(contact.updated_at)}
        </p>
      </div>

      <form id={updateFormId} action={updateAction} className="flex flex-1 flex-col">
        <input type="hidden" name="contactId" value={contact.id} />

        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-first-name-${contact.id}`}
                className="text-sm font-medium text-zinc-900"
              >
                Vorname
              </label>
              <input
                id={`contact-first-name-${contact.id}`}
                name="firstName"
                type="text"
                maxLength={200}
                defaultValue={contact.first_name ?? ''}
                disabled={isPending}
                className={inputClassName}
              />
              {updateState.fieldErrors?.firstName ? (
                <p className="text-sm text-red-600">{updateState.fieldErrors.firstName}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-last-name-${contact.id}`}
                className="text-sm font-medium text-zinc-900"
              >
                Nachname
              </label>
              <input
                id={`contact-last-name-${contact.id}`}
                name="lastName"
                type="text"
                maxLength={200}
                defaultValue={contact.last_name ?? ''}
                disabled={isPending}
                className={inputClassName}
              />
              {updateState.fieldErrors?.lastName ? (
                <p className="text-sm text-red-600">{updateState.fieldErrors.lastName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`contact-company-${contact.id}`}
              className="text-sm font-medium text-zinc-900"
            >
              Firma
            </label>
            <input
              id={`contact-company-${contact.id}`}
              name="company"
              type="text"
              maxLength={200}
              defaultValue={contact.company ?? ''}
              disabled={isPending}
              className={inputClassName}
            />
            {updateState.fieldErrors?.company ? (
              <p className="text-sm text-red-600">{updateState.fieldErrors.company}</p>
            ) : null}
          </div>

          {updateState.fieldErrors?.identity ? (
            <p className="text-sm text-red-600">{updateState.fieldErrors.identity}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-email-${contact.id}`}
                className="text-sm font-medium text-zinc-900"
              >
                E-Mail
                <span className="font-normal text-zinc-500"> (optional)</span>
              </label>
              <input
                id={`contact-email-${contact.id}`}
                name="email"
                type="email"
                maxLength={200}
                defaultValue={contact.email ?? ''}
                disabled={isPending}
                className={inputClassName}
              />
              {updateState.fieldErrors?.email ? (
                <p className="text-sm text-red-600">{updateState.fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-phone-${contact.id}`}
                className="text-sm font-medium text-zinc-900"
              >
                Telefon
                <span className="font-normal text-zinc-500"> (optional)</span>
              </label>
              <input
                id={`contact-phone-${contact.id}`}
                name="phone"
                type="tel"
                maxLength={200}
                defaultValue={contact.phone ?? ''}
                disabled={isPending}
                className={inputClassName}
              />
              {updateState.fieldErrors?.phone ? (
                <p className="text-sm text-red-600">{updateState.fieldErrors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor={`contact-notes-${contact.id}`}
              className="text-sm font-medium text-zinc-900"
            >
              Notizen
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id={`contact-notes-${contact.id}`}
              name="notes"
              rows={8}
              defaultValue={contact.notes ?? ''}
              disabled={isPending}
              placeholder="Weitere Informationen zum Kontakt …"
              className={`${inputClassName} min-h-[10rem] resize-y`}
            />
          </div>

          {updateState.error ? (
            <p className="text-sm text-red-600">{updateState.error}</p>
          ) : null}
          {updateState.success ? (
            <p className="text-sm text-zinc-600">Änderungen gespeichert.</p>
          ) : null}
        </div>
      </form>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="contactId" value={contact.id} />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-5 py-4">
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Kontakt wirklich löschen?</span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletePending ? 'Wird gelöscht …' : 'Löschen bestätigen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 disabled:opacity-60"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:opacity-60"
            >
              Kontakt löschen
            </button>
          )}
          {deleteState.error ? (
            <p className="mt-2 text-sm text-red-600">{deleteState.error}</p>
          ) : null}
        </div>

        <button
          type="submit"
          form={updateFormId}
          disabled={isPending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
        >
          {isUpdatePending ? 'Wird gespeichert …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
