'use client'

import { useActionState, useEffect, useRef, type FormEvent } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconCheckSquare } from '@/features/dashboard/components/dashboard-icons'
import { appendInboxInternalNoteAction } from '@/features/inbox/actions/append-inbox-internal-note'
import type { KfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { listKfzManualTriageActions } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { KFZ_COPY_NO_STATUS_CHANGE, KFZ_HANDOFF_NO_SEND } from '@/features/inbox/lib/kfz-reply-handoff'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosFieldErrorSmClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type InboxManualStatusActionsProps = {
  item: InboxItem
  linkedTaskId?: string | null
  onStatusChange: () => void
  onLocalApply?: (command: KfzManualTriageCommand) => void
}

const initialState: InboxItemMutationState = {}

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

export function InboxManualStatusActions({
  item,
  linkedTaskId = null,
  onStatusChange,
  onLocalApply,
}: InboxManualStatusActionsProps) {
  const [contactedState, contactedAction, isContactedPending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const [followUpState, followUpAction, isFollowUpPending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const actions = listKfzManualTriageActions(item, linkedTaskId)
  const markContacted = actions.find((action) => action.id === 'mark_contacted')
  const markFollowUp = actions.find((action) => action.id === 'mark_follow_up')
  const isBusy = isContactedPending || isFollowUpPending

  function localSubmit(command: KfzManualTriageCommand) {
    return (event: FormEvent<HTMLFormElement>) => {
      if (!onLocalApply) {
        return
      }
      event.preventDefault()
      onLocalApply(command)
    }
  }

  if (!markContacted?.available && !markFollowUp?.available) {
    return (
      <section aria-label="Manueller Status" className={aosWorkspaceSectionClassName}>
        <WorkspaceSectionHeading
          title="Manueller Status"
          accent="green"
          icon={<DashboardIconCheckSquare className="h-4 w-4" />}
        />
        <p className={aosWorkspaceMetaClassName}>
          Explizite Statuswechsel sind in der Chronik gespeichert. {KFZ_HANDOFF_NO_SEND}
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Manueller Status" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Manueller Status"
        accent="green"
        icon={<DashboardIconCheckSquare className="h-4 w-4" />}
      />
      <p className={`mb-3 ${aosWorkspaceMetaClassName}`}>
        Nur nach explizitem Klick · {KFZ_COPY_NO_STATUS_CHANGE}
      </p>

      <RefreshOnSuccess
        state={contactedState}
        isPending={isContactedPending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />
      <RefreshOnSuccess
        state={followUpState}
        isPending={isFollowUpPending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />

      <div className="space-y-4">
        {markContacted?.available ? (
          <form
            action={contactedAction}
            onSubmit={localSubmit({ type: 'mark_contacted' })}
            className="space-y-2"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="currentContent" value={item.content} />
            <input type="hidden" name="kind" value="mark_contacted" />
            <button
              type="submit"
              disabled={isBusy}
              className={aosWorkspaceActionPrimaryClassName}
            >
              {isContactedPending ? '…' : markContacted.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{markContacted.description}</p>
            {contactedState.error ? (
              <p className={aosFieldErrorSmClassName}>{contactedState.error}</p>
            ) : null}
          </form>
        ) : null}

        {markFollowUp?.available ? (
          <form
            action={followUpAction}
            onSubmit={localSubmit({ type: 'mark_follow_up' })}
            className="space-y-2"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="currentContent" value={item.content} />
            <input type="hidden" name="kind" value="mark_follow_up" />
            <button
              type="submit"
              disabled={isBusy}
              className={aosWorkspaceActionAccentClassName}
            >
              {isFollowUpPending ? '…' : markFollowUp.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{markFollowUp.description}</p>
            {followUpState.error ? (
              <p className={aosFieldErrorSmClassName}>{followUpState.error}</p>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  )
}
