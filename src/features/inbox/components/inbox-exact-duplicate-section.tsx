'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, type FormEvent } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import { applyInboxDuplicateDecisionAction } from '@/features/inbox/actions/apply-inbox-duplicate-decision'
import type {
  InboxDuplicateCandidate,
  InboxDuplicateDecisionCommand,
  InboxDuplicateRelatedItem,
  InboxDuplicateReview,
} from '@/features/inbox/lib/inbox-exact-duplicate-review'
import {
  INBOX_DUPLICATE_DISMISS_LABEL,
  INBOX_DUPLICATE_HINT,
  INBOX_DUPLICATE_OPEN_LABEL,
  INBOX_DUPLICATE_RELATE_LABEL,
  INBOX_DUPLICATE_RELATED_SECTION_LABEL,
  INBOX_DUPLICATE_RETURN_HINT,
  INBOX_DUPLICATE_SECTION_LABEL,
  INBOX_DUPLICATE_UNLINK_LABEL,
} from '@/features/inbox/lib/inbox-exact-duplicate-review'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosFieldErrorSmClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type InboxExactDuplicateSectionProps = {
  itemId: string
  review: InboxDuplicateReview
  onApplied?: () => void
  onLocalApply?: (command: InboxDuplicateDecisionCommand) => void
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
  onSuccess?: () => void
}) {
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [itemId])

  useEffect(() => {
    if (wasPendingRef.current && !isPending && state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      onSuccess?.()
    }
    wasPendingRef.current = isPending
  }, [isPending, onSuccess, state.success])

  return null
}

function CandidateMeta({ candidate }: { candidate: InboxDuplicateCandidate }) {
  return (
    <div className="aos-inbox-duplicate-card">
      <p className={`text-sm font-medium ${aosWsTextPrimaryClassName}`}>{candidate.headline}</p>
      <p className={aosWorkspaceMetaClassName}>
        {candidate.sourceLabel}
        <span className="mx-1.5 text-zinc-300">·</span>
        {candidate.receivedAtLabel}
        <span className="mx-1.5 text-zinc-300">·</span>
        {candidate.statusLabel}
      </p>
      <p className={`mt-1 text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}>{candidate.summary}</p>
      {candidate.matches.length > 0 ? (
        <ul className="aos-inbox-duplicate-matches">
          {candidate.matches.map((match) => (
            <li key={`${candidate.itemId}:${match.fieldId}`}>{match.explanation}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function DuplicateDecisionForm({
  itemId,
  candidate,
  type,
  label,
  className,
  onApplied,
  onLocalApply,
}: {
  itemId: string
  candidate: InboxDuplicateCandidate | InboxDuplicateRelatedItem
  type: InboxDuplicateDecisionCommand['type']
  label: string
  className: string
  onApplied?: () => void
  onLocalApply?: (command: InboxDuplicateDecisionCommand) => void
}) {
  const [state, formAction, isPending] = useActionState(
    applyInboxDuplicateDecisionAction,
    initialState,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!onLocalApply) {
      return
    }
    event.preventDefault()
    if (type === 'unlink') {
      onLocalApply({ type: 'unlink', otherItemId: candidate.itemId })
      return
    }
    onLocalApply({
      type,
      otherItemId: candidate.itemId,
      fieldIds: candidate.matchFieldIds,
    })
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <RefreshOnSuccess
        state={state}
        isPending={isPending}
        itemId={itemId}
        onSuccess={onApplied}
      />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="otherItemId" value={candidate.itemId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="fieldIds" value={candidate.matchFieldIds.join(',')} />
      <button type="submit" disabled={isPending} className={className}>
        {isPending ? '…' : label}
      </button>
      {state.error ? <p className={`mt-1 ${aosFieldErrorSmClassName}`}>{state.error}</p> : null}
    </form>
  )
}

export function InboxExactDuplicateSection({
  itemId,
  review,
  onApplied,
  onLocalApply,
}: InboxExactDuplicateSectionProps) {
  if (!review.visible) {
    return null
  }

  return (
    <section aria-label={INBOX_DUPLICATE_SECTION_LABEL} className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title={
          review.hasPending ? INBOX_DUPLICATE_SECTION_LABEL : INBOX_DUPLICATE_RELATED_SECTION_LABEL
        }
        accent="orange"
        icon={<DashboardIconFileText className="h-4 w-4" />}
      />
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">{INBOX_DUPLICATE_HINT}</p>
      <p className={`mb-4 ${aosWorkspaceMetaClassName}`}>{INBOX_DUPLICATE_RETURN_HINT}</p>

      {review.pending.map((candidate) => (
        <article
          key={candidate.itemId}
          className="aos-inbox-duplicate"
          aria-label={`${INBOX_DUPLICATE_SECTION_LABEL}: ${candidate.headline}`}
        >
          <CandidateMeta candidate={candidate} />
          <div className="aos-inbox-duplicate-actions">
            <Link href={candidate.href} className={aosWorkspaceActionPrimaryClassName}>
              {INBOX_DUPLICATE_OPEN_LABEL}
            </Link>
            <DuplicateDecisionForm
              itemId={itemId}
              candidate={candidate}
              type="relate"
              label={INBOX_DUPLICATE_RELATE_LABEL}
              className={aosWorkspaceActionEmphasisClassName}
              onApplied={onApplied}
              onLocalApply={onLocalApply}
            />
            <DuplicateDecisionForm
              itemId={itemId}
              candidate={candidate}
              type="dismiss"
              label={INBOX_DUPLICATE_DISMISS_LABEL}
              className={aosWorkspaceActionClassName}
              onApplied={onApplied}
              onLocalApply={onLocalApply}
            />
          </div>
        </article>
      ))}

      {review.related.length > 0 && review.hasPending ? (
        <h4 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {INBOX_DUPLICATE_RELATED_SECTION_LABEL}
        </h4>
      ) : null}

      {review.related.map((candidate) => (
        <article
          key={`related:${candidate.itemId}`}
          className="aos-inbox-duplicate aos-inbox-duplicate--related"
          aria-label={`${INBOX_DUPLICATE_RELATED_SECTION_LABEL}: ${candidate.headline}`}
        >
          <CandidateMeta candidate={candidate} />
          <div className="aos-inbox-duplicate-actions">
            <Link href={candidate.href} className={aosWorkspaceActionPrimaryClassName}>
              {INBOX_DUPLICATE_OPEN_LABEL}
            </Link>
            <DuplicateDecisionForm
              itemId={itemId}
              candidate={candidate}
              type="unlink"
              label={INBOX_DUPLICATE_UNLINK_LABEL}
              className={aosWorkspaceActionClassName}
              onApplied={onApplied}
              onLocalApply={onLocalApply}
            />
          </div>
        </article>
      ))}
    </section>
  )
}
