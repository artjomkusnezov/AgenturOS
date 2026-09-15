'use client'

import Link from 'next/link'
import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconCheckSquare, DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import { resolveInboxItemSourceVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardAccent } from '@/features/dashboard/components/dashboard-icons'
import { deleteInboxItemAction } from '@/features/inbox/actions/delete-inbox-item'
import { InboxPromotionMenu } from '@/features/inbox/components/inbox-promotion-menu'
import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { reopenInboxItemAction } from '@/features/inbox/actions/reopen-inbox-item'
import { updateInboxItemAction } from '@/features/inbox/actions/update-inbox-item'
import { InboxAiProposalSection } from '@/features/ai-inbound/components/inbox-ai-proposal-section'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import { InboxAttachmentSection } from '@/features/inbox/components/inbox-attachment-section'
import { InboxExactDuplicateSection } from '@/features/inbox/components/inbox-exact-duplicate-section'
import { InboxKfzReplyHandoffActions } from '@/features/inbox/components/inbox-kfz-reply-handoff-actions'
import { InboxKfzResponseDraftSection } from '@/features/inbox/components/inbox-kfz-response-draft-section'
import { InboxKfzReviewSection } from '@/features/inbox/components/inbox-kfz-review-section'
import { InboxKfzTriageActions } from '@/features/inbox/components/inbox-kfz-triage-actions'
import { InboxManualStatusActions } from '@/features/inbox/components/inbox-manual-status-actions'
import type { InboxWorkQueueFilter } from '@/features/inbox/lib/inbox-factual-work-queue'
import type { KfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { InboxManualReviewHistorySection } from '@/features/inbox/components/inbox-manual-review-history'
import type { InboxDuplicateDecisionCommand } from '@/features/inbox/lib/inbox-exact-duplicate-review'
import { presentInboxDuplicateReview } from '@/features/inbox/lib/inbox-exact-duplicate-review'
import { getInboxItemSourceLabel } from '@/features/inbox/lib/inbox-source'
import type { InboxItemView } from '@/features/inbox/lib/inbox-item-view'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import {
  INBOX_HISTORY_OPEN_LABEL,
  INBOX_HISTORY_RETURN_LABEL,
  presentInboxManualReviewHistory,
} from '@/features/inbox/lib/inbox-manual-review-history'
import { KFZ_INBOX_HREF_BASE, KFZ_WORK_QUEUE_PHASE_LABELS, type KfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import { formatInboxDateTime, isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import { resolveInboxAttributionLabel } from '@/features/inbox/lib/resolve-inbox-attribution'
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
  memberNameMap?: Record<string, string>
  /** Internal AI proposal for Kfz website leads — advisory only. */
  aiProposal?: InboxAiProposal | null
  phaseFilter?: KfzWorkQueueFilter
  queueFilter?: InboxWorkQueueFilter
  sourceFilter?: InboxSourceFilter
  searchQuery?: string
  itemView?: InboxItemView
  hrefBasePath?: string
  allowLocalHistoryFixtureFacts?: boolean
  onBack?: () => void
  onDeleted: () => void
  onStatusChange: () => void
  onLocalApply?: (command: KfzManualTriageCommand) => void
  onLocalDuplicateApply?: (command: InboxDuplicateDecisionCommand) => void
  queueItems?: InboxItem[]
  taskRelationsByItemId?: Record<string, string>
}

const initialState: InboxItemMutationState = {}

const CHANNEL_ACCENT_CLASS: Record<DashboardAccent, string> = {
  blue: 'aos-inbox-channel--blue',
  green: 'aos-inbox-channel--green',
  violet: 'aos-inbox-channel--violet',
  orange: 'aos-inbox-channel--orange',
  neutral: 'aos-inbox-channel--neutral',
}

function InboxStatusActionButton({
  itemId,
  variant,
  onSuccess,
  onLocalApply,
}: {
  itemId: string
  variant: 'process' | 'reopen'
  onSuccess: () => void
  onLocalApply?: (command: KfzManualTriageCommand) => void
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
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!onLocalApply || variant !== 'process') {
          return
        }
        event.preventDefault()
        onLocalApply({ type: 'mark_handled', at: new Date().toISOString() })
      }}
    >
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
  memberNameMap = {},
  aiProposal = null,
  phaseFilter = 'all',
  queueFilter = 'all',
  sourceFilter = 'all',
  searchQuery = '',
  itemView = 'work',
  hrefBasePath = KFZ_INBOX_HREF_BASE,
  allowLocalHistoryFixtureFacts = false,
  onBack,
  onDeleted,
  onStatusChange,
  onLocalApply,
  onLocalDuplicateApply,
  queueItems = [],
  taskRelationsByItemId = {},
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
  const creatorName = resolveInboxAttributionLabel(item, memberNameMap)
  const sourceVisual = resolveInboxItemSourceVisual(item)
  const kfzReview = presentKfzWebsiteInboxItem(item, { linkedTaskId })
  const duplicateReview = presentInboxDuplicateReview(item, queueItems.length > 0 ? queueItems : [item], {
    phase: phaseFilter,
    queue: queueFilter,
    source: sourceFilter,
    q: searchQuery,
    basePath: hrefBasePath,
    taskRelationsByItemId,
    allowLocalFixtureFacts: allowLocalHistoryFixtureFacts,
  })
  const history = presentInboxManualReviewHistory(item, {
    linkedTaskId,
    phase: phaseFilter,
    queue: queueFilter,
    source: sourceFilter,
    q: searchQuery,
    view: itemView,
    basePath: hrefBasePath,
    allowLocalFixtureFacts: allowLocalHistoryFixtureFacts,
  })
  const isHistoryView = itemView === 'history'
  const draftFormId = `kfz-response-draft-${item.id}`
  const aiSuggestedReply =
    aiProposal?.status === 'proposal' ? aiProposal.suggestion.suggestedReplyDraft : null

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
        <div className="mb-2 flex flex-wrap items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-11 items-center px-1 text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800 lg:hidden"
            >
              ← Liste
            </button>
          ) : null}
          {isHistoryView ? (
            <Link
              href={history.workHref}
              className="inline-flex min-h-11 items-center px-1 text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800"
            >
              ← {INBOX_HISTORY_RETURN_LABEL}
            </Link>
          ) : (
            <Link
              href={history.historyHref}
              className="inline-flex min-h-11 items-center px-1 text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800"
            >
              {INBOX_HISTORY_OPEN_LABEL}
            </Link>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <span
              className={`aos-inbox-channel mt-0.5 ${CHANNEL_ACCENT_CLASS[sourceVisual.accent]}`}
              aria-hidden="true"
            >
              <span className="[&_svg]:h-4 [&_svg]:w-4">{sourceVisual.icon}</span>
            </span>
            <p className={`min-w-0 flex-1 ${aosWorkspaceMetaClassName}`}>
              <span>{getInboxItemSourceLabel(item)}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span>
                {item.channel === 'whatsapp' ||
                item.channel === 'email' ||
                item.channel === 'website'
                  ? `Von ${creatorName}`
                  : `Erfasst von ${creatorName}`}
              </span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span>{formatInboxDateTime(item.created_at)}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span>
                {kfzReview
                  ? KFZ_WORK_QUEUE_PHASE_LABELS[kfzReview.phase]
                  : isUnprocessed
                    ? 'Unbearbeitet'
                    : 'Bearbeitet'}
              </span>
            </p>
          </div>

          {isHistoryView ? null : (
            <InboxStatusActionButton
              itemId={item.id}
              variant={isUnprocessed ? 'process' : 'reopen'}
              onSuccess={onStatusChange}
              onLocalApply={onLocalApply}
            />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isHistoryView ? (
          <InboxManualReviewHistorySection history={history} />
        ) : (
          <>
            <InboxKfzReviewSection review={kfzReview} />
            <InboxExactDuplicateSection
              itemId={item.id}
              review={duplicateReview}
              onApplied={onStatusChange}
              onLocalApply={onLocalDuplicateApply}
            />
            {kfzReview ? (
              <InboxKfzResponseDraftSection
                key={`${item.id}:${kfzReview.responseDraft}`}
                item={item}
                review={kfzReview}
                aiSuggestedReply={aiSuggestedReply}
                formId={draftFormId}
                onStatusChange={onStatusChange}
                onLocalApply={onLocalApply}
              />
            ) : null}

            {kfzReview ? (
              <InboxKfzReplyHandoffActions
                item={item}
                review={kfzReview}
                onStatusChange={onStatusChange}
                onLocalApply={onLocalApply}
              />
            ) : null}

            {kfzReview ? (
              <InboxKfzTriageActions
                item={item}
                linkedTaskId={linkedTaskId}
                review={kfzReview}
                onStatusChange={onStatusChange}
                onLocalApply={onLocalApply}
                hideHandledAction
              />
            ) : (
              <InboxManualStatusActions
                item={item}
                linkedTaskId={linkedTaskId}
                onStatusChange={onStatusChange}
                onLocalApply={onLocalApply}
              />
            )}

            {kfzReview ? (
              <section aria-label="Quelltext" className={aosWorkspaceSectionClassName}>
                <WorkspaceSectionHeading
                  title="Quelltext"
                  accent="blue"
                  icon={<DashboardIconFileText className="h-4 w-4" />}
                />
                <p className={`mb-2 ${aosWorkspaceMetaClassName}`}>
                  Bestand aus dem Eingang — unverändert, getrennt von Entwurf und Notizen
                </p>
                <p className={`${aosDocBodyClassName} whitespace-pre-wrap min-h-[8rem]`}>
                  {kfzReview.sourceContent}
                </p>
              </section>
            ) : (
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
            )}

            <InboxAttachmentSection attachments={attachments} />

            <InboxTranscriptionSection
              item={item}
              attachments={attachments}
              onStatusChange={onStatusChange}
            />

            <InboxAiProposalSection proposal={aiProposal} />

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
          </>
        )}
      </div>

      {isHistoryView ? null : (
        <>
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
              form={kfzReview ? draftFormId : updateFormId}
              disabled={isPending}
              className={aosWorkspaceActionEmphasisClassName}
            >
              {isUpdatePending ? '…' : kfzReview ? 'Entwurf speichern' : 'Speichern'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
