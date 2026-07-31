'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteInformationItemAction } from '@/features/information/actions/delete-information-item'
import { updateInformationItemAction } from '@/features/information/actions/update-information-item'
import { formatInformationDateTime } from '@/features/information/lib/information-status'
import type { InformationItem, InformationMutationState } from '@/features/information/types/information-item'
import {
  aosBtnDangerClassName,
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosCardPanelClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

type InformationDetailPanelProps = {
  item: InformationItem
  onBack?: () => void
  onDeleted: () => void
}

const initialState: InformationMutationState = {}

export function InformationDetailPanel({
  item,
  onBack,
  onDeleted,
}: InformationDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateInformationItemAction,
    initialState
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteInformationItemAction,
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
    <div className={`${aosCardPanelClassName} h-full`}>
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
          Information bearbeiten
        </h2>
        <p className="mt-2 text-xs text-zinc-500">
          Zuletzt geändert am {formatInformationDateTime(item.updated_at)}
        </p>
      </div>

      <form
        id={updateFormId}
        action={updateAction}
        className="flex flex-1 flex-col"
      >
        <input type="hidden" name="itemId" value={item.id} />

        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`information-title-${item.id}`} className={aosTextLabelClassName}>
              Titel
            </label>
            <input
              id={`information-title-${item.id}`}
              name="title"
              type="text"
              required
              maxLength={200}
              defaultValue={item.title}
              disabled={isPending}
              className={aosInputClassName}
            />
            {updateState.fieldErrors?.title ? (
              <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor={`information-content-${item.id}`}
              className={aosTextLabelClassName}
            >
              Inhalt
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id={`information-content-${item.id}`}
              name="content"
              rows={12}
              defaultValue={item.content ?? ''}
              disabled={isPending}
              placeholder="Details, Notizen, Links oder weiteres Wissen …"
              className={`${aosTextareaClassName} min-h-[12rem]`}
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
        <input type="hidden" name="itemId" value={item.id} />
      </form>

      <div className={`${aosPanelFooterClassName} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Information wirklich löschen?</span>
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
              Information löschen
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
