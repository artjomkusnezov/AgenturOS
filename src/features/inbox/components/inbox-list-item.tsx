'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { processInboxItemAction } from '@/features/inbox/actions/process-inbox-item'
import { reopenInboxItemAction } from '@/features/inbox/actions/reopen-inbox-item'
import { truncateInboxContentPreview } from '@/features/inbox/lib/format-inbox-content'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { formatInboxDateTime, isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'

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
    <div className="flex shrink-0 flex-col items-center gap-1">
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
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
            variant === 'process'
              ? 'border-zinc-200/80 bg-white text-zinc-500 hover:border-accent/40 hover:text-accent'
              : 'border-zinc-200/80 bg-zinc-50 text-zinc-600 hover:bg-white hover:text-zinc-900'
          }`}
        >
          {isPending ? (
            <span className="text-xs">…</span>
          ) : variant === 'process' ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6h18M3 18h10" />
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
      className={`flex items-start gap-2 rounded-xl px-2 py-2 transition-colors duration-150 ${
        isSelected
          ? 'bg-white shadow-sm ring-1 ring-zinc-200/80'
          : subdued
            ? 'hover:bg-white/50'
            : 'hover:bg-white/70'
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
        className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <p
          className={`line-clamp-2 text-sm font-medium ${
            subdued ? 'text-zinc-600' : 'text-zinc-900'
          }`}
        >
          {truncateInboxContentPreview(item.content)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">{getInboxSourceLabel(item.source)}</span>
          <span className={`text-xs ${subdued ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {formatInboxDateTime(item.created_at)}
          </span>
        </div>
      </button>
    </div>
  )
}
