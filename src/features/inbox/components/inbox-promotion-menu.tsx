'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { buildCasesItemHref } from '@/features/cases/lib/cases-workspace-urls'
import { convertInboxToOfferAction } from '@/features/inbox/actions/convert-inbox-to-offer'
import { convertInboxToTaskAction } from '@/features/inbox/actions/convert-inbox-to-task'
import {
  DashboardIconCalendar,
  DashboardIconCheckSquare,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconInfo,
} from '@/features/dashboard/components/dashboard-icons'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'
import {
  aosFieldErrorSmClassName,
  aosWorkspaceActionAccentClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type PromotionOption = {
  key: 'task' | 'offer' | 'claim' | 'follow_up' | 'information'
  title: string
  description: string
  icon: typeof DashboardIconCheckSquare
}

const PROMOTION_OPTIONS: PromotionOption[] = [
  {
    key: 'task',
    title: 'Aufgabe',
    description: 'Etwas erledigen',
    icon: DashboardIconCheckSquare,
  },
  {
    key: 'offer',
    title: 'Angebot',
    description: 'Angebot vorbereiten',
    icon: DashboardIconFileText,
  },
  {
    key: 'claim',
    title: 'Schaden',
    description: 'Schaden bearbeiten',
    icon: DashboardIconFlag,
  },
  {
    key: 'follow_up',
    title: 'Wiedervorlage',
    description: 'Später erneut ansehen',
    icon: DashboardIconCalendar,
  },
  {
    key: 'information',
    title: 'Information',
    description: 'Wissen speichern',
    icon: DashboardIconInfo,
  },
]

const initialState: InboxItemMutationState = {}

const optionButtonClassName =
  'flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-70'

export function InboxPromotionMenu({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [taskState, taskFormAction, isTaskPending] = useActionState(
    convertInboxToTaskAction,
    initialState,
  )
  const [offerState, offerFormAction, isOfferPending] = useActionState(
    convertInboxToOfferAction,
    initialState,
  )
  const [isNavigating, startNavigation] = useTransition()
  const handledSuccessKeyRef = useRef<string | null>(null)

  const isBusy = isTaskPending || isOfferPending || isNavigating
  const showMenuPanel = isOpen && !isBusy
  const activeSuccess =
    taskState.success && taskState.taskId
      ? taskState
      : offerState.success && offerState.caseId
        ? offerState
        : null
  const activeError = activeSuccess
    ? null
    : !isBusy && (taskState.error || offerState.error)
      ? taskState.error || offerState.error || null
      : null

  useEffect(() => {
    if (!activeSuccess) {
      return
    }

    const successKey =
      activeSuccess.promotionKind === 'offer' && activeSuccess.caseId
        ? `${itemId}:offer:${activeSuccess.caseId}`
        : activeSuccess.taskId
          ? `${itemId}:task:${activeSuccess.taskId}`
          : null

    if (!successKey || handledSuccessKeyRef.current === successKey) {
      return
    }

    handledSuccessKeyRef.current = successKey

    startNavigation(() => {
      if (activeSuccess.promotionKind === 'offer' && activeSuccess.caseId) {
        router.push(
          buildCasesItemHref('cases', activeSuccess.viewKey ?? 'offers', {
            caseId: activeSuccess.caseId,
          }),
        )
      } else if (activeSuccess.taskId) {
        router.push(`/app/tasks?task=${encodeURIComponent(activeSuccess.taskId)}`)
      }

      router.refresh()
    })
  }, [activeSuccess, itemId, router, startNavigation])

  function handleToggle() {
    if (isBusy) {
      return
    }

    setIsOpen((current) => !current)
  }

  function handlePlaceholderSelect() {
    if (isBusy) {
      return
    }

    setIsOpen(false)
  }

  function handlePromotionSubmit() {
    // Menü nur schließen; Formulare bleiben gemountet (hidden), damit der
    // Server-Action-Submit nicht durch Unmount abgebrochen wird.
    setIsOpen(false)
  }

  return (
    <div className="relative max-w-full">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isBusy}
        className={`${aosWorkspaceActionAccentClassName} disabled:cursor-wait disabled:opacity-70`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {isBusy ? 'Übernahme läuft...' : 'Übernehmen als...'}
      </button>

      {activeSuccess?.promotionKind === 'task' ? (
        <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>Aufgabe erstellt</p>
      ) : null}

      {activeSuccess?.promotionKind === 'offer' ? (
        <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>Angebot erstellt</p>
      ) : null}

      {activeError ? (
        <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{activeError}</p>
      ) : null}

      <div
        role="menu"
        aria-label="Übernehmen als"
        aria-hidden={!showMenuPanel}
        className={`mt-3 max-w-full space-y-1 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/95 p-2 shadow-sm ${
          showMenuPanel ? '' : 'hidden'
        }`}
      >
        {PROMOTION_OPTIONS.map((option) => {
          const Icon = option.icon
          const isTask = option.key === 'task'
          const isOffer = option.key === 'offer'

          if (isTask || isOffer) {
            return (
              <form
                key={option.key}
                action={isTask ? taskFormAction : offerFormAction}
                onSubmit={handlePromotionSubmit}
                className="w-full"
              >
                <input type="hidden" name="itemId" value={itemId} />
                <button
                  type="submit"
                  role="menuitem"
                  disabled={isBusy}
                  className={optionButtonClassName}
                >
                  <span className="mt-0.5 shrink-0 text-zinc-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-900">
                      {option.title}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {option.description}
                    </span>
                  </span>
                </button>
              </form>
            )
          }

          if (!showMenuPanel) {
            return null
          }

          return (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              disabled={isBusy}
              onClick={handlePlaceholderSelect}
              className={optionButtonClassName}
            >
              <span className="mt-0.5 shrink-0 text-zinc-500">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-900">
                  {option.title}
                </span>
                <span className="block text-xs text-zinc-500">{option.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
