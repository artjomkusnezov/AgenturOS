'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { resolveInboxItemSourceVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardAccent } from '@/features/dashboard/components/dashboard-icons'
import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { reopenInboxItemAction } from '@/features/inbox/actions/reopen-inbox-item'
import { InboxStatusChip } from '@/features/inbox/components/inbox-status-chip'
import { presentUnifiedInboxCard } from '@/features/inbox/lib/present-unified-inbox-card'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import type { KfzWorkQueueFilter } from '@/features/inbox/lib/kfz-work-queue'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListRowSubduedClassName,
  aosListSelectedClassName,
  aosListStatusBtnClassName,
  aosListStatusBtnDoneClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type InboxListItemProps = {
  item: InboxItem
  isSelected: boolean
  subdued?: boolean
  linkedTaskId?: string | null
  onSelect: (itemId: string) => void
  memberNameMap?: Record<string, string>
  phaseFilter?: KfzWorkQueueFilter
  sourceFilter?: InboxSourceFilter
  hrefBasePath?: string | null
}

const initialState: InboxItemMutationState = {}

const CHANNEL_ACCENT_CLASS: Record<DashboardAccent, string> = {
  blue: 'aos-inbox-channel--blue',
  green: 'aos-inbox-channel--green',
  violet: 'aos-inbox-channel--violet',
  orange: 'aos-inbox-channel--orange',
  neutral: 'aos-inbox-channel--neutral',
}

function InboxStatusForm({
  itemId,
  variant,
}: {
  itemId: string
  variant: 'process' | 'reopen'
}) {
  const router = useRouter()
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
      router.refresh()
    }

    wasPendingRef.current = isPending
  }, [isPending, state.success, router])

  return (
    <div className="flex shrink-0 flex-col items-center">
      <form
        action={formAction}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => event.stopPropagation()}
      >
        <input type="hidden" name="itemId" value={itemId} />
        <button
          type="submit"
          disabled={isPending}
          aria-label={
            variant === 'process'
              ? 'Als bearbeitet markieren'
              : 'Eingangselement wieder öffnen'
          }
          className={
            variant === 'process' ? aosListStatusBtnClassName : aosListStatusBtnDoneClassName
          }
        >
          {isPending ? (
            <span className="text-[8px] text-zinc-400">…</span>
          ) : (
            <svg
              className="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      </form>
      {state.error ? (
        <p className="max-w-16 text-center text-[10px] leading-tight text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}

export function InboxListItem({
  item,
  isSelected,
  subdued = false,
  linkedTaskId = null,
  onSelect,
  phaseFilter = 'all',
  sourceFilter = 'all',
  hrefBasePath = null,
}: InboxListItemProps) {
  const isUnprocessed = isInboxItemUnprocessed(item)
  const sourceVisual = resolveInboxItemSourceVisual(item)
  const card = presentUnifiedInboxCard(item, {
    linkedTaskId,
    phase: phaseFilter,
    source: sourceFilter,
    basePath: hrefBasePath,
  })

  return (
    <div
      className={`${aosListRowClassName} items-start py-2 ${
        isSelected
          ? aosListSelectedClassName
          : subdued
            ? aosListRowSubduedClassName
            : aosListRowHoverClassName
      }`}
    >
      <InboxStatusForm
        itemId={item.id}
        variant={isUnprocessed ? 'process' : 'reopen'}
      />

      <span
        className={`aos-inbox-channel ${CHANNEL_ACCENT_CLASS[sourceVisual.accent]}`}
        aria-hidden="true"
      >
        <span className="[&_svg]:h-4 [&_svg]:w-4">{sourceVisual.icon}</span>
      </span>

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isSelected ? 'true' : undefined}
        className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className={`min-w-0 flex-1 truncate text-[13px] leading-snug font-medium ${aosWsTextPrimaryClassName}`}
          >
            {card.headline}
          </p>
          <InboxStatusChip label={card.reviewStatus.label} kind={card.reviewStatus.kind} />
        </div>

        <p className={`mt-0.5 truncate text-[11px] leading-none ${aosWsTextMetaClassName}`}>
          <span>{card.sourceLabel}</span>
          <span className="mx-1" aria-hidden="true">
            ·
          </span>
          <span>{card.receivedAtLabel}</span>
        </p>
        <div className="aos-inbox-queue-copy">
          <p className="aos-inbox-queue-line">{card.customerContact}</p>
          <p className="aos-inbox-queue-line">{card.requestSummary}</p>
          {card.urgencyNote ? (
            <p className="aos-inbox-queue-urgency">{card.urgencyNote}</p>
          ) : null}
          <p className="mt-1 flex min-w-0 items-center gap-1.5">
            <span
              className={
                card.missingCount > 0 ? 'aos-inbox-chip-gaps' : 'aos-inbox-chip-handled'
              }
            >
              {card.missingInformationLabel}
            </span>
          </p>
          {card.nextActionLabel ? (
            <p className="aos-inbox-queue-next">{card.nextActionLabel}</p>
          ) : null}
        </div>
      </button>
    </div>
  )
}
