'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { reopenInboxItemAction } from '@/features/inbox/actions/reopen-inbox-item'
import { truncateInboxContentPreview } from '@/features/inbox/lib/format-inbox-content'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { formatInboxListDate, isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListRowSubduedClassName,
  aosListSelectedClassName,
  aosListStatusBtnClassName,
  aosListStatusBtnDoneClassName,
} from '@/lib/design-system'

type InboxListItemProps = {
  item: InboxItem
  isSelected: boolean
  subdued?: boolean
  onSelect: (itemId: string) => void
}

const initialState: InboxItemMutationState = {}

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
  onSelect,
}: InboxListItemProps) {
  const isUnprocessed = isInboxItemUnprocessed(item)

  return (
    <div
      className={`${aosListRowClassName} ${
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

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isSelected ? 'true' : undefined}
        className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <p
          className={`truncate text-[13px] leading-snug ${
            subdued ? 'font-normal text-zinc-500' : 'font-medium text-zinc-900'
          }`}
        >
          {truncateInboxContentPreview(item.content)}
        </p>

        <p className="mt-0.5 truncate text-[11px] leading-none text-zinc-400">
          <span>{getInboxSourceLabel(item.source)}</span>
          <span className="mx-1 text-zinc-300">·</span>
          <span>{formatInboxListDate(item.created_at)}</span>
        </p>
      </button>
    </div>
  )
}
