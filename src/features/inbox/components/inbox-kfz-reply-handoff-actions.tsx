'use client'

import { useActionState, useEffect, useRef, type FormEvent } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconCheckSquare } from '@/features/dashboard/components/dashboard-icons'
import { appendInboxInternalNoteAction } from '@/features/inbox/actions/append-inbox-internal-note'
import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { InboxKfzCopyButton } from '@/features/inbox/components/inbox-kfz-copy-button'
import type { KfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  KFZ_COPY_NO_STATUS_CHANGE,
  KFZ_HANDOFF_NO_SEND,
  KFZ_WHATSAPP_PREFERENCE_ONLY,
} from '@/features/inbox/lib/kfz-reply-handoff'
import type { KfzWebsiteInboxReview } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosFieldErrorSmClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type InboxKfzReplyHandoffActionsProps = {
  item: InboxItem
  review: KfzWebsiteInboxReview
  onStatusChange: () => void
  onLocalApply?: (command: KfzManualTriageCommand) => void
}

const initialState: InboxItemMutationState = {}

function actionById(
  review: KfzWebsiteInboxReview,
  id: KfzWebsiteInboxReview['availableActions'][number]['id'],
) {
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

export function InboxKfzReplyHandoffActions({
  item,
  review,
  onStatusChange,
  onLocalApply,
}: InboxKfzReplyHandoffActionsProps) {
  const [prepareState, prepareAction, isPreparePending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const [contactedState, contactedAction, isContactedPending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const [followUpState, followUpAction, isFollowUpPending] = useActionState(
    appendInboxInternalNoteAction,
    initialState,
  )
  const [handledState, handledAction, isHandledPending] = useActionState(
    processInboxItemAction,
    initialState,
  )

  const prepareReply = actionById(review, 'prepare_reply')
  const markContacted = actionById(review, 'mark_contacted')
  const markFollowUp = actionById(review, 'mark_follow_up')
  const markHandled = actionById(review, 'mark_handled')
  const isBusy =
    isPreparePending || isContactedPending || isFollowUpPending || isHandledPending
  const primaryId = review.replyHandoff.primaryActionId

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
    <section aria-label="Manuelle Antwortübergabe" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Manuelle Antwortübergabe"
        accent="green"
        icon={<DashboardIconCheckSquare className="h-4 w-4" />}
        trailing={
          <span
            className={
              review.replyHandoff.state === 'handled'
                ? 'aos-inbox-chip-handled'
                : review.replyHandoff.state === 'contacted' ||
                    review.replyHandoff.state === 'follow_up'
                  ? 'aos-inbox-chip-review'
                  : 'aos-inbox-chip-new'
            }
          >
            {review.preferredChannelContact.channelLabel}
          </span>
        }
      />

      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        Nur nach explizitem Klick · {KFZ_HANDOFF_NO_SEND}
      </p>
      {review.replyHandoff.whatsAppIsPreferenceOnly ? (
        <p className={`mb-3 ${aosWorkspaceMetaClassName}`}>{KFZ_WHATSAPP_PREFERENCE_ONLY}</p>
      ) : null}
      <p className={`mb-4 ${aosWorkspaceMetaClassName}`}>{KFZ_COPY_NO_STATUS_CHANGE}</p>

      <RefreshOnSuccess
        state={prepareState}
        isPending={isPreparePending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />
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
      <RefreshOnSuccess
        state={handledState}
        isPending={isHandledPending}
        itemId={item.id}
        onSuccess={onStatusChange}
      />

      <div className="mb-4">
        <InboxKfzCopyButton
          value={review.copyTargets.draft}
          label="Geprüften Entwurf kopieren"
          emptyLabel="Kein Entwurf zum Kopieren — zuerst intern vorbereiten."
        />
      </div>

      <div className="space-y-4">
        {prepareReply?.available ? (
          <form
            action={prepareAction}
            onSubmit={localSubmit({ type: 'prepare_reply' })}
            className="space-y-2"
          >
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="currentContent" value={item.content} />
            <input type="hidden" name="kind" value="prepare_reply" />
            <button
              type="submit"
              disabled={isBusy}
              className={
                primaryId === 'prepare_reply'
                  ? aosWorkspaceActionPrimaryClassName
                  : aosWorkspaceActionAccentClassName
              }
            >
              {isPreparePending ? '…' : prepareReply.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{prepareReply.description}</p>
            {prepareState.error ? (
              <p className={aosFieldErrorSmClassName}>{prepareState.error}</p>
            ) : null}
          </form>
        ) : null}

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
              className={
                primaryId === 'mark_contacted'
                  ? aosWorkspaceActionPrimaryClassName
                  : aosWorkspaceActionAccentClassName
              }
            >
              {isContactedPending ? '…' : markContacted.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{markContacted.description}</p>
            {contactedState.error ? (
              <p className={aosFieldErrorSmClassName}>{contactedState.error}</p>
            ) : null}
          </form>
        ) : review.replyHandoff.state === 'contacted' ||
          review.replyHandoff.state === 'follow_up' ||
          review.replyHandoff.state === 'handled' ? (
          <p className={aosWorkspaceMetaClassName}>
            Manuell als kontaktiert bestätigt. Kopieren allein hat das nicht ausgelöst.
          </p>
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
              className={
                primaryId === 'mark_follow_up'
                  ? aosWorkspaceActionPrimaryClassName
                  : aosWorkspaceActionAccentClassName
              }
            >
              {isFollowUpPending ? '…' : markFollowUp.label}
            </button>
            <p className={aosWorkspaceMetaClassName}>{markFollowUp.description}</p>
            {followUpState.error ? (
              <p className={aosFieldErrorSmClassName}>{followUpState.error}</p>
            ) : null}
          </form>
        ) : null}

        {markHandled?.available ? (
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
              className={
                primaryId === 'mark_handled'
                  ? aosWorkspaceActionPrimaryClassName
                  : aosWorkspaceActionEmphasisClassName
              }
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
            Bereits manuell als erledigt markiert.
          </p>
        )}
      </div>
    </section>
  )
}
