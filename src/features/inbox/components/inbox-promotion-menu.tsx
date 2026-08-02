'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { convertInboxToTaskAction } from '@/features/inbox/actions/convert-inbox-to-task'
import {
  DashboardIconCalendar,
  DashboardIconCheckSquare,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconInfo,
} from '@/features/dashboard/components/dashboard-icons'
import {
  aosWorkspaceActionAccentClassName,
  aosFieldErrorSmClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'
import type { InboxItemMutationState } from '@/features/inbox/types/inbox-item'

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

export function InboxPromotionMenu({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PromotionOption['key'] | null>(null)
  const [state, formAction, isPending] = useActionState(convertInboxToTaskAction, initialState)
  const wasPendingRef = useRef(false)
  const handledSuccessRef = useRef(false)

  const selectedLabel =
    selectedOption == null
      ? null
      : PROMOTION_OPTIONS.find((option) => option.key === selectedOption)?.title ?? null

  useEffect(() => {
    if (wasPendingRef.current && !isPending && state.success && state.taskId && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      setIsOpen(false)
      router.push(`/app/tasks?task=${encodeURIComponent(state.taskId)}`)
      router.refresh()
    }

    wasPendingRef.current = isPending
  }, [isPending, router, state.success, state.taskId])

  useEffect(() => {
    if (!isPending) {
      handledSuccessRef.current = false
    }
  }, [isPending, itemId])

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={aosWorkspaceActionAccentClassName}
        aria-expanded={isOpen}
      >
        Übernehmen als...
      </button>

      {state.success && state.taskId ? (
        <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>Aufgabe erstellt.</p>
      ) : null}
      {state.error ? <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.error}</p> : null}

      {isOpen ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-zinc-200/70 bg-white/90 p-2 shadow-sm">
          {PROMOTION_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = option.key === selectedOption
            const isTask = option.key === 'task'

            return (
              <div key={option.key}>
                {isTask ? (
                  <form action={formAction}>
                    <input type="hidden" name="itemId" value={itemId} />
                    <button
                      type="submit"
                      disabled={isPending}
                      onClick={() => setSelectedOption(option.key)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[var(--aos-color-soft-blue-bg)] text-zinc-900'
                          : 'hover:bg-zinc-50'
                      } disabled:cursor-wait disabled:opacity-70`}
                    >
                      <span className="mt-0.5 text-zinc-500">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-900">{option.title}</span>
                        <span className="block text-xs text-zinc-500">
                          {isPending && selectedOption === option.key
                            ? 'Übernahme läuft...'
                            : option.description}
                        </span>
                      </span>
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedOption(option.key)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                      isSelected
                        ? 'bg-[var(--aos-color-soft-blue-bg)] text-zinc-900'
                        : 'hover:bg-zinc-50'
                    }`}
                  >
                    <span className="mt-0.5 text-zinc-500">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-zinc-900">{option.title}</span>
                      <span className="block text-xs text-zinc-500">{option.description}</span>
                    </span>
                  </button>
                )}
              </div>
            )
          })}

          {selectedLabel && selectedOption !== 'task' ? (
            <p className={`px-1 pt-1 ${aosWorkspaceMetaClassName}`}>
              {selectedLabel} ausgewählt. Promotion folgt im nächsten Schritt.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
