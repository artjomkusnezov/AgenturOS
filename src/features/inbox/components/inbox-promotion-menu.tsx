'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

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
  const [state, formAction, isPending] = useActionState(convertInboxToTaskAction, initialState)
  const [isNavigating, startNavigation] = useTransition()
  const handledSuccessKeyRef = useRef<string | null>(null)

  const isBusy = isPending || isNavigating
  const showSuccess = Boolean(state.success && state.taskId)
  const showError = Boolean(state.error) && !isBusy

  useEffect(() => {
    if (!state.success || !state.taskId) {
      return
    }

    const successKey = `${itemId}:${state.taskId}`
    if (handledSuccessKeyRef.current === successKey) {
      return
    }

    handledSuccessKeyRef.current = successKey

    startNavigation(() => {
      router.push(`/app/tasks?task=${encodeURIComponent(state.taskId!)}`)
      router.refresh()
    })
  }, [itemId, router, startNavigation, state.success, state.taskId])

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

  function handleTaskSelect() {
    if (isBusy) {
      return
    }

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

      {showSuccess ? (
        <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>Aufgabe erstellt</p>
      ) : null}

      {showError ? (
        <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.error}</p>
      ) : null}

      {isOpen && !isBusy ? (
        <div
          role="menu"
          aria-label="Übernehmen als"
          className="mt-3 max-w-full space-y-1 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/95 p-2 shadow-sm"
        >
          {PROMOTION_OPTIONS.map((option) => {
            const Icon = option.icon
            const isTask = option.key === 'task'

            if (isTask) {
              return (
                <form key={option.key} action={formAction} className="w-full">
                  <input type="hidden" name="itemId" value={itemId} />
                  <button
                    type="submit"
                    role="menuitem"
                    disabled={isBusy}
                    onClick={handleTaskSelect}
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
      ) : null}
    </div>
  )
}
