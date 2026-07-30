'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteInformationItemAction } from '@/features/information/actions/delete-information-item'
import { updateInformationItemAction } from '@/features/information/actions/update-information-item'
import { formatInformationDateTime } from '@/features/information/lib/information-status'
import type { InformationItem, InformationMutationState } from '@/features/information/types/information-item'

type InformationDetailPanelProps = {
  item: InformationItem
  onBack?: () => void
  onDeleted: () => void
}

const initialState: InformationMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

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
            <label htmlFor={`information-title-${item.id}`} className="text-sm font-medium text-zinc-900">
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
              className={inputClassName}
            />
            {updateState.fieldErrors?.title ? (
              <p className="text-sm text-red-600">{updateState.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor={`information-content-${item.id}`}
              className="text-sm font-medium text-zinc-900"
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
              className={`${inputClassName} min-h-[12rem] resize-y`}
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
        <input type="hidden" name="itemId" value={item.id} />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-5 py-4">
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Information wirklich löschen?</span>
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
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
        >
          {isUpdatePending ? 'Wird gespeichert …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
