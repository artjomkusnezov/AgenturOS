'use client'

import Link from 'next/link'
import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconCheckSquare, DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import { deleteInboxItemAction } from '@/features/inbox/actions/delete-inbox-item'
import { InboxPromotionMenu } from '@/features/inbox/components/inbox-promotion-menu'
import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { reopenInboxItemAction } from '@/features/inbox/actions/reopen-inbox-item'
import { updateInboxItemAction } from '@/features/inbox/actions/update-inbox-item'
import { InboxAttachmentSection } from '@/features/inbox/components/inbox-attachment-section'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { formatInboxDateTime, isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type {
  InboxItem,
  InboxItemMutationState,
  InboxLinkedFile,
} from '@/features/inbox/types/inbox-item'
import { InboxTranscriptionSection } from '@/features/transcription/components/inbox-transcription-section'
import {
  aosBtnDangerClassName,
  aosDocBodyClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWorkspaceSurfaceClassName,
} from '@/lib/design-system'

type InboxDetailPanelProps = {
  item: InboxItem
  linkedTaskId: string | null
  attachments?: InboxLinkedFile[]
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
          variant === 'process'
            ? aosWorkspaceActionEmphasisClassName
            : aosWorkspaceActionPrimaryClassName
        }
      >
        {isPending ? '…' : variant === 'process' ? 'Erledigt' : 'Wieder öffnen'}
      </button>
      {state.error ? <p className={`mt-1 ${aosFieldErrorSmClassName}`}>{state.error}</p> : null}
    </form>
  )
}

export function InboxDetailPanel({
  item,
  linkedTaskId,
  attachments = [],
  onBack,
  onDeleted,
  onStatusChange,
}: InboxDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateInboxItemAction,
    initialState,
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteInboxItemAction,
    initialState,
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
    <div className={`${aosWorkspaceSurfaceClassName} min-h-[24rem] lg:min-h-0`}>
      <div className={aosPanelHeaderClassName}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800 lg:hidden"
          >
            ← Liste
          </button>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <p className={`min-w-0 flex-1 ${aosWorkspaceMetaClassName}`}>
            <span>{getInboxSourceLabel(item.source)}</span>
            <span className="mx-1.5 text-zinc-300">·</span>
            <span>{formatInboxDateTime(item.created_at)}</span>
            <span className="mx-1.5 text-zinc-300">·</span>
            <span>{isUnprocessed ? 'Unbearbeitet' : 'Bearbeitet'}</span>
          </p>

          <InboxStatusActionButton
            itemId={item.id}
            variant={isUnprocessed ? 'process' : 'reopen'}
            onSuccess={onStatusChange}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <form id={updateFormId} action={updateAction} className="flex flex-col">
          <input type="hidden" name="itemId" value={item.id} />

          <section
            aria-label="Inhalt"
            className={`${aosWorkspaceSectionClassName} flex flex-1 flex-col`}
          >
            <WorkspaceSectionHeading
              title="Inhalt"
              accent="blue"
              icon={<DashboardIconFileText className="h-4 w-4" />}
            />
            <label htmlFor={`inbox-content-${item.id}`} className="sr-only">
              Inhalt
            </label>
            <textarea
              id={`inbox-content-${item.id}`}
              name="content"
              rows={16}
              required
              defaultValue={item.content}
              disabled={isPending}
              className={`${aosDocBodyClassName} min-h-[18rem]`}
            />
            {updateState.fieldErrors?.content ? (
              <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{updateState.fieldErrors.content}</p>
            ) : null}
            {updateState.error ? (
              <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{updateState.error}</p>
            ) : null}
            {updateState.success ? (
              <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>Gespeichert.</p>
            ) : null}
          </section>
        </form>

        <InboxAttachmentSection attachments={attachments} />

        <InboxTranscriptionSection
          item={item}
          attachments={attachments}
          onStatusChange={onStatusChange}
        />

        <section aria-label="Aufgabe" className={aosWorkspaceSectionClassName}>
          <WorkspaceSectionHeading
            title="Aufgabe"
            accent="green"
            icon={<DashboardIconCheckSquare className="h-4 w-4" />}
          />
          {linkedTaskId ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={aosWorkspaceMetaClassName}>In Aufgabe übernommen</span>
              <Link
                href={`/app/tasks?task=${linkedTaskId}`}
                className={aosWorkspaceActionAccentClassName}
              >
                Öffnen
              </Link>
            </div>
          ) : (
            <InboxPromotionMenu key={item.id} itemId={item.id} />
          )}
        </section>
      </div>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="itemId" value={item.id} />
      </form>

      <div className={`${aosPanelFooterClassName} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={aosWorkspaceMetaClassName}>Wirklich löschen?</span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className={aosBtnDangerClassName}
              >
                {isDeletePending ? '…' : 'Löschen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className={aosWorkspaceActionClassName}
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-60"
            >
              Löschen
            </button>
          )}
          {deleteState.error ? (
            <p className="mt-1 text-xs text-red-600">{deleteState.error}</p>
          ) : null}
        </div>

        <button
          type="submit"
          form={updateFormId}
          disabled={isPending}
          className={aosWorkspaceActionEmphasisClassName}
        >
          {isUpdatePending ? '…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
