'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, type FormEvent } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconCheckSquare } from '@/features/dashboard/components/dashboard-icons'
import { appendInboxInternalNoteAction } from '@/features/inbox/actions/append-inbox-internal-note'
import { convertInboxToTaskAction } from '@/features/inbox/actions/convert-inbox-to-task'
import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import type { KfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import type { KfzWebsiteInboxReview } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosFieldErrorSmClassName,
  aosTextareaClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type InboxKfzTriageActionsProps = {
  item: InboxItem
  linkedTaskId: string | null
  review: KfzWebsiteInboxReview
  onStatusChange: () => void
  onLocalApply?: (command: KfzManualTriageCommand) => void
  hideHandledAction?: boolean
}

const initialState: InboxItemMutationState = {}

function actionById(review: KfzWebsiteInboxReview, id: KfzWebsiteInboxReview['availableActions'][number]['id']) {
  return review.availableActions.find((action) => action.id === id) ?? null
}

function RefreshOnSuccess({
  state,
  isPending,
  itemId,
  onSuccess,
}: {
  state: InboxItemMutationState
  isPending: boolean
  itemId: string
  onSuccess: () => void
}) {
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

  return null
}

export function InboxKfzTriageActions({
  item,
  linkedTaskId,
  review,
  onStatusChange,
  onLocalApply,
  hideHandledAction = false,
}: InboxKfzTriageActionsProps) {
  const [startState, startAction, isStartPending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const [noteState, noteAction, isNotePending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const [taskState, taskAction, isTaskPending] = useActionState(
    convertInboxToTaskAction,
    initialState,
  )
  const [handledState, handledAction, isHandledPending] = useActionState(
    processInboxItemAction,
    initialState,
  )

  const startReview = actionById(review, 'start_review')
  const recordNote = actionById(review, 'record_internal_note')
  const followUp = actionById(review, 'create_follow_up_task')
  const markHandled = actionById(review, 'mark_handled')
  const isBusy = isStartPending || isNotePending || isTaskPending || isHandledPending

  function localSubmit(command: KfzManualTriageCommand) {
    return (event: FormEvent<HTMLFormElement>) => {
      if (!onLocalApply) {
        return
      }
      event.preventDefault()
      onLocalApply(command)
    }
  }

  return (
    <section aria-label="Manuelle Prüfung" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Manuelle Prüfung"
        accent="green"
        icon={<DashboardIconCheckSquare className="h-4 w-4" />}
      />

      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        Bestehende Inbox-Aktionen · nur nach explizitem Klick · kein automatischer Versand
      </p>

      <RefreshOnSuccess
        state={startState}
        isPending={isStartPending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />
      <RefreshOnSuccess
        state={noteState}
        isPending={isNotePending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />
      <RefreshOnSuccess
        state={taskState}
        isPending={isTaskPending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />
      <RefreshOnSuccess
        state={handledState}
        isPending={isHandledPending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />

      <div className="space-y-4">
        {startReview?.available ? (
          <form
            action={startAction}
            onSubmit={localSubmit({ type: 'start_review' })}
            className="space-y-2"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="currentContent" value={item.content} />
            <input type="hidden" name="kind" value="start_review" />
            <button
              type="submit"
              disabled={isBusy}
              className={aosWorkspaceActionPrimaryClassName}
            >
              {isStartPending ? '…' : startReview.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{startReview.description}</p>
            {startState.fieldErrors?.note ? (
              <p className={aosFieldErrorSmClassName}>{startState.fieldErrors.note}</p>
            ) : null}
            {startState.error ? (
              <p className={aosFieldErrorSmClassName}>{startState.error}</p>
            ) : null}
          </form>
        ) : review.phase === 'in_review' ? (
          <p className={aosWorkspaceMetaClassName}>Prüfung läuft intern.</p>
        ) : null}

        {recordNote ? (
          <form
            action={noteAction}
            onSubmit={(event) => {
              if (!onLocalApply) {
                return
              }
              event.preventDefault()
              const form = event.currentTarget
              const note = String(new FormData(form).get('note') ?? '')
              onLocalApply({ type: 'record_internal_note', note })
            }}
            className="space-y-2"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="currentContent" value={item.content} />
            <input type="hidden" name="kind" value="internal_note" />
            <label htmlFor={`kfz-internal-note-${item.id}`} className={aosWorkspaceMetaClassName}>
              {recordNote.label}
            </label>
            <textarea
              id={`kfz-internal-note-${item.id}`}
              name="note"
              rows={3}
              disabled={isBusy}
              placeholder="Nur intern — wird nicht an den Kunden gesendet."
              className={aosTextareaClassName}
            />
            <button
              type="submit"
              disabled={isBusy}
              className={aosWorkspaceActionAccentClassName}
            >
              {isNotePending ? '…' : 'Interne Notiz speichern'}
            </button>
            <p className={aosWorkspaceMetaClassName}>{recordNote.description}</p>
            {noteState.fieldErrors?.note ? (
              <p className={aosFieldErrorSmClassName}>{noteState.fieldErrors.note}</p>
            ) : null}
            {noteState.error ? (
              <p className={aosFieldErrorSmClassName}>{noteState.error}</p>
            ) : null}
            {noteState.success && noteState.noteKind === 'internal_note' ? (
              <p className={aosWorkspaceMetaClassName}>Interne Notiz gespeichert.</p>
            ) : null}
          </form>
        ) : null}

        {linkedTaskId ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={aosWorkspaceMetaClassName}>Interne Folgeaufgabe vorhanden</span>
            <Link
              href={`/app/tasks?task=${linkedTaskId}`}
              className={aosWorkspaceActionAccentClassName}
            >
              Aufgabe öffnen
            </Link>
          </div>
        ) : followUp?.available ? (
          <form action={taskAction} className="space-y-2">
            <input type="hidden" name="itemId" value={item.id} />
            <button
              type="submit"
              disabled={isBusy}
              className={aosWorkspaceActionAccentClassName}
            >
              {isTaskPending ? '…' : followUp.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{followUp.description}</p>
            {taskState.error ? (
              <p className={aosFieldErrorSmClassName}>{taskState.error}</p>
            ) : null}
          </form>
        ) : null}

        {hideHandledAction ? null : markHandled?.available ? (
          <form
            action={handledAction}
            onSubmit={localSubmit({
              type: 'mark_handled',
              at: new Date().toISOString(),
            })}
            className="space-y-2"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <button
              type="submit"
              disabled={isBusy}
              className={aosWorkspaceActionEmphasisClassName}
            >
              {isHandledPending ? '…' : markHandled.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{markHandled.description}</p>
            {handledState.error ? (
              <p className={aosFieldErrorSmClassName}>{handledState.error}</p>
            ) : null}
          </form>
        ) : (
          <p className={aosWorkspaceMetaClassName}>
            Bereits manuell als bearbeitet markiert.
          </p>
        )}
      </div>
    </section>
  )
}
