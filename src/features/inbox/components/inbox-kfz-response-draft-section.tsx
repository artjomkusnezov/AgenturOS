'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import { saveInboxResponseDraftAction } from '@/features/inbox/actions/save-inbox-response-draft'
import { InboxKfzCopyButton } from '@/features/inbox/components/inbox-kfz-copy-button'
import type { KfzManualTriageCommand } from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  KFZ_AI_DRAFT_REVIEW_LABEL,
  KFZ_RESPONSE_DRAFT_MAX_LENGTH,
  KFZ_RESPONSE_DRAFT_NO_SEND,
} from '@/features/inbox/lib/kfz-response-draft'
import type { KfzWebsiteInboxReview } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosDocBodyClassName,
  aosFieldErrorSmClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type InboxKfzResponseDraftSectionProps = {
  item: InboxItem
  review: KfzWebsiteInboxReview
  aiSuggestedReply?: string | null
  formId?: string
  onStatusChange: () => void
  onLocalApply?: (command: KfzManualTriageCommand) => void
}

const initialState: InboxItemMutationState = {}

export function InboxKfzResponseDraftSection({
  item,
  review,
  aiSuggestedReply = null,
  formId,
  onStatusChange,
  onLocalApply,
}: InboxKfzResponseDraftSectionProps) {
  const generatedFormId = useId()
  const resolvedFormId = formId ?? generatedFormId
  const [state, formAction, isPending] = useActionState(
    saveInboxResponseDraftAction,
    initialState,
  )
  const [draft, setDraft] = useState(review.responseDraft)
  const suggestion = aiSuggestedReply?.trim() ?? ''
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    if (
      wasPendingRef.current &&
      !isPending &&
      state.success &&
      state.noteKind === 'response_draft' &&
      !handledSuccessRef.current
    ) {
      handledSuccessRef.current = true
      onStatusChange()
    }
    wasPendingRef.current = isPending
  }, [isPending, state.success, state.noteKind, onStatusChange])

  return (
    <section aria-label="Interner Antwortentwurf" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Interner Antwortentwurf"
        accent="blue"
        icon={<DashboardIconFileText className="h-4 w-4" />}
        trailing={
          <span
            className={
              review.hasResponseDraft ? 'aos-inbox-chip-handled' : 'aos-inbox-chip-gaps'
            }
          >
            {review.hasResponseDraft ? 'Entwurf gespeichert' : 'Kein Entwurf'}
          </span>
        }
      />

      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        Nur intern · {KFZ_RESPONSE_DRAFT_NO_SEND}
      </p>

      {suggestion ? (
        <div className="mb-4 space-y-2">
          <p className={aosWorkspaceMetaClassName}>{KFZ_AI_DRAFT_REVIEW_LABEL}</p>
          <p
            className={`whitespace-pre-wrap rounded-md border border-dashed border-violet-200 bg-violet-50/70 px-3 py-2 text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}
          >
            {suggestion}
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setDraft(suggestion)}
            className={aosWorkspaceActionAccentClassName}
          >
            Als Ausgangsentwurf übernehmen
          </button>
          <p className={aosWorkspaceMetaClassName}>
            Übernehmen kopiert den Vorschlag in das Bearbeitungsfeld. Es wird nichts
            gesendet.
          </p>
        </div>
      ) : null}

      <div className="mb-3">
        <InboxKfzCopyButton
          value={draft.trim() || null}
          label="Geprüften Entwurf kopieren"
          emptyLabel="Kein Entwurf zum Kopieren"
        />
      </div>

      <form
        id={resolvedFormId}
        action={formAction}
        onSubmit={(event) => {
          if (!onLocalApply) {
            return
          }
          event.preventDefault()
          onLocalApply({ type: 'save_response_draft', draft })
        }}
        className="space-y-2"
      >
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="currentContent" value={item.content} />
        <label htmlFor={`kfz-response-draft-${item.id}`} className={aosWorkspaceMetaClassName}>
          Antwort intern vorbereiten
        </label>
        <textarea
          id={`kfz-response-draft-${item.id}`}
          name="draft"
          rows={10}
          maxLength={KFZ_RESPONSE_DRAFT_MAX_LENGTH}
          value={draft}
          disabled={isPending}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Interner Entwurf — wird nicht an den Kunden gesendet."
          className={`${aosDocBodyClassName} min-h-[12rem]`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={aosWorkspaceMetaClassName}>
            {draft.trim().length}/{KFZ_RESPONSE_DRAFT_MAX_LENGTH} · kein Versand
          </p>
          <button
            type="submit"
            disabled={isPending}
            className={aosWorkspaceActionEmphasisClassName}
          >
            {isPending ? '…' : 'Internen Entwurf speichern'}
          </button>
        </div>
        {state.fieldErrors?.draft ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.draft}</p>
        ) : null}
        {state.error ? <p className={aosFieldErrorSmClassName}>{state.error}</p> : null}
        {state.success && state.noteKind === 'response_draft' ? (
          <p className={aosWorkspaceMetaClassName}>
            Interner Entwurf gespeichert. Nichts wurde gesendet.
          </p>
        ) : null}
      </form>
    </section>
  )
}
