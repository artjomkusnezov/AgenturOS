'use client'

import Link from 'next/link'
import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { convertInboxToTaskAction } from '@/features/inbox/actions/convert-inbox-to-task'
import { deleteInboxItemAction } from '@/features/inbox/actions/delete-inbox-item'
import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { reopenInboxItemAction } from '@/features/inbox/actions/reopen-inbox-item'
import { updateInboxItemAction } from '@/features/inbox/actions/update-inbox-item'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { formatInboxDateTime, isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosBtnDangerClassName,
  aosBtnGhostLgClassName,
  aosBtnPrimaryClassName,
  aosBtnPrimaryLgClassName,
  aosBtnSecondaryClassName,
  aosCardPanelClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

type InboxDetailPanelProps = {
  item: InboxItem
  linkedTaskId: string | null
  onBack?: () => void
  onDeleted: () => void
  onStatusChange: () => void
}

const initialState: InboxItemMutationState = {}

function InboxStatusActionButton({
  itemId,
  variant,
  onSuccess,
}: {
  itemId: string
  variant: 'process' | 'reopen'
  onSuccess: () => void
}) {
  const action = variant === 'process' ? processInboxItemAction : reopenInboxItemAction
  const [state, formAction, isPending] = useActionState(action, initialState)
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [itemId, variant])

  useEffect(() => {
    if (wasPendingRef.current && !isPending && state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      onSuccess()
    }

    wasPendingRef.current = isPending
  }, [isPending, state.success, onSuccess])

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        disabled={isPending}
        className={
          variant === 'process' ? aosBtnPrimaryClassName : aosBtnSecondaryClassName
        }
      >
        {isPending
          ? variant === 'process'
            ? 'Wird markiert …'
            : 'Wird geöffnet …'
          : variant === 'process'
            ? 'Als bearbeitet markieren'
            : 'Wieder öffnen'}
      </button>
      {state.error ? <p className={aosFieldErrorSmClassName}>{state.error}</p> : null}
    </form>
  )
}

function ConvertToTaskButton({
  itemId,
  onSuccess,
}: {
  itemId: string
  onSuccess: () => void
}) {
  const [state, formAction, isPending] = useActionState(convertInboxToTaskAction, initialState)
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [itemId])

  useEffect(() => {
    if (wasPendingRef.current && !isPending && state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      onSuccess()
    }

    wasPendingRef.current = isPending
  }, [isPending, state.success, onSuccess])

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        disabled={isPending}
        className={aosBtnPrimaryClassName}
      >
        {isPending ? 'Wird übernommen …' : 'Als Aufgabe übernehmen'}
      </button>
      {state.error ? <p className={aosFieldErrorSmClassName}>{state.error}</p> : null}
    </form>
  )
}

export function InboxDetailPanel({
  item,
  linkedTaskId,
  onBack,
  onDeleted,
  onStatusChange,
}: InboxDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateInboxItemAction,
    initialState
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteInboxItemAction,
    initialState
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handledDeleteRef = useRef(false)
  const isUnprocessed = isInboxItemUnprocessed(item)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  const isPending = isUpdatePending || isDeletePending

  return (
    <div className={`${aosCardPanelClassName} h-full`}>
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 px-5 py-4">
        <div className="min-w-0 flex-1">
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
            Eingangselement bearbeiten
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{getInboxSourceLabel(item.source)}</span>
            <span className="text-xs text-zinc-500">
              Erfasst am {formatInboxDateTime(item.created_at)}
            </span>
            <span className="text-xs text-zinc-500">
              {isUnprocessed ? 'Unbearbeitet' : 'Bearbeitet'}
            </span>
          </div>
        </div>

        <InboxStatusActionButton
          itemId={item.id}
          variant={isUnprocessed ? 'process' : 'reopen'}
          onSuccess={onStatusChange}
        />
      </div>

      <form
        id={updateFormId}
        action={updateAction}
        className="flex flex-1 flex-col"
      >
        <input type="hidden" name="itemId" value={item.id} />

        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor={`inbox-content-${item.id}`} className={aosTextLabelClassName}>
              Inhalt
            </label>
            <textarea
              id={`inbox-content-${item.id}`}
              name="content"
              rows={12}
              required
              defaultValue={item.content}
              disabled={isPending}
              className={`${aosTextareaClassName} min-h-[14rem]`}
            />
            {updateState.fieldErrors?.content ? (
              <p className={aosFieldErrorSmClassName}>{updateState.fieldErrors.content}</p>
            ) : null}
          </div>

          {updateState.error ? (
            <p className={aosFieldErrorSmClassName}>{updateState.error}</p>
          ) : null}
          {updateState.success ? (
            <p className="text-sm text-zinc-600">Änderungen gespeichert.</p>
          ) : null}

          <div className="border-t border-zinc-200/70 pt-4">
            {linkedTaskId ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-zinc-600">✓ In Aufgabe übernommen</span>
                <Link
                  href={`/app/tasks?taskId=${linkedTaskId}`}
                  className={aosBtnSecondaryClassName}
                >
                  Aufgabe öffnen
                </Link>
              </div>
            ) : (
              <ConvertToTaskButton itemId={item.id} onSuccess={onStatusChange} />
            )}
          </div>
        </div>
      </form>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="itemId" value={item.id} />
      </form>

      <div className={`${aosPanelFooterClassName} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Eingangselement wirklich löschen?</span>
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
              Eingangselement löschen
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
