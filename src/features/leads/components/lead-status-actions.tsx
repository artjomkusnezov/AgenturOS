'use client'

import { useActionState, useEffect, useRef } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconTarget } from '@/features/dashboard/components/dashboard-icons'
import type { InboxItem, InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import { setKfzLeadStatusAction } from '@/features/leads/actions/set-kfz-lead-status'
import {
  KFZ_LEAD_NO_AUTO_ACTION,
  KFZ_LEAD_STATUS_LABELS,
  KFZ_LEAD_STATUSES,
  type KfzLeadStatus,
} from '@/features/leads/lib/kfz-lead-status'
import {
  aosFieldErrorSmClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

const initialState: InboxItemMutationState = {}

type LeadStatusActionsProps = {
  item: InboxItem
  currentStatus: KfzLeadStatus
  onStatusChange: () => void
  onLocalApply?: (status: KfzLeadStatus) => void
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

export function LeadStatusActions({
  item,
  currentStatus,
  onStatusChange,
  onLocalApply,
}: LeadStatusActionsProps) {
  const [state, formAction, isPending] = useActionState(setKfzLeadStatusAction, initialState)

  return (
    <section aria-label="Lead-Status" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Lead-Status"
        accent="blue"
        icon={<DashboardIconTarget className="h-4 w-4" />}
      />
      <p className={`mb-3 ${aosWorkspaceMetaClassName}`}>
        Neu → Kontaktiert → Termin/Angebot → Gewonnen / Verloren. {KFZ_LEAD_NO_AUTO_ACTION}
      </p>
      {!onLocalApply ? (
        <RefreshOnSuccess
          state={state}
          isPending={isPending}
          itemId={item.id}
          onSuccess={onStatusChange}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {KFZ_LEAD_STATUSES.map((status) => {
          const selected = status === currentStatus
          const className = selected
            ? aosWorkspaceActionPrimaryClassName
            : 'aos-workspace-action min-h-11'

          if (onLocalApply) {
            return (
              <button
                key={status}
                type="button"
                disabled={selected}
                onClick={() => onLocalApply(status)}
                className={className}
                aria-pressed={selected}
              >
                {KFZ_LEAD_STATUS_LABELS[status]}
              </button>
            )
          }

          return (
            <form key={status} action={formAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                disabled={isPending || selected}
                className={className}
                aria-pressed={selected}
              >
                {KFZ_LEAD_STATUS_LABELS[status]}
              </button>
            </form>
          )
        })}
      </div>
      {state.error ? (
        <p className={`mt-2 ${aosFieldErrorSmClassName}`} role="alert">
          {state.error}
        </p>
      ) : null}
    </section>
  )
}
