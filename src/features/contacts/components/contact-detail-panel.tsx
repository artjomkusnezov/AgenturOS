'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteContactAction } from '@/features/contacts/actions/delete-contact'
import { updateContactAction } from '@/features/contacts/actions/update-contact'
import { formatContactListLabel } from '@/features/contacts/lib/format-contact-label'
import { formatContactDateTime } from '@/features/contacts/lib/contact-status'
import type { Contact, ContactMutationState } from '@/features/contacts/types/contact'
import {
  aosBtnDangerClassName,
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
  aosWorkspaceSurfaceClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
  aosWsTextSecondaryClassName,
} from '@/lib/design-system'

type ContactDetailPanelProps = {
  contact: Contact
  onBack?: () => void
  onDeleted: () => void
}

const initialState: ContactMutationState = {}

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
    <div className={`${aosWorkspaceSurfaceClassName} h-full min-h-0`}>
      <div className="border-b border-zinc-200/40 px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`mb-2 inline-flex items-center text-sm font-medium ${aosWsTextMetaClassName} transition-colors duration-150 hover:text-sky-300 lg:hidden`}
          >
            ← Zurück zur Liste
          </button>
        ) : null}
        <h2 className={`text-sm font-semibold tracking-tight ${aosWsTextPrimaryClassName}`}>
          Kontakt bearbeiten
        </h2>
        <p className={`mt-1 text-sm ${aosWsTextSecondaryClassName}`}>
          {formatContactListLabel(contact)}
        </p>
        <p className={`mt-2 text-xs ${aosWsTextMetaClassName}`}>
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
                className={aosTextLabelClassName}
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
                className={aosInputClassName}
              />
              {updateState.fieldErrors?.firstName ? (
                <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.firstName}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-last-name-${contact.id}`}
                className={aosTextLabelClassName}
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
                className={aosInputClassName}
              />
              {updateState.fieldErrors?.lastName ? (
                <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.lastName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`contact-company-${contact.id}`}
              className={aosTextLabelClassName}
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
              className={aosInputClassName}
            />
            {updateState.fieldErrors?.company ? (
              <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.company}</p>
            ) : null}
          </div>

          {updateState.fieldErrors?.identity ? (
            <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.identity}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-email-${contact.id}`}
                className={aosTextLabelClassName}
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
                className={aosInputClassName}
              />
              {updateState.fieldErrors?.email ? (
                <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`contact-phone-${contact.id}`}
                className={aosTextLabelClassName}
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
                className={aosInputClassName}
              />
              {updateState.fieldErrors?.phone ? (
                <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor={`contact-notes-${contact.id}`}
              className={aosTextLabelClassName}
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
              className={`${aosTextareaClassName} min-h-[10rem]`}
            />
          </div>

          {updateState.error ? (
            <p className={aosFieldErrorSmClassName}>{updateState.error}</p>
          ) : null}
          {updateState.success ? (
            <p className="text-sm text-zinc-600">Änderungen gespeichert.</p>
          ) : null}
        </div>
      </form>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="contactId" value={contact.id} />
      </form>

      <div className={`${aosPanelFooterClassName} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Kontakt wirklich löschen?</span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className={aosBtnDangerClassName}
              >
                {isDeletePending ? 'Wird gelöscht …' : 'Löschen bestätigen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className={aosBtnGhostLgClassName}
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
          className={aosBtnPrimaryLgClassName}
        >
          {isUpdatePending ? 'Wird gespeichert …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
