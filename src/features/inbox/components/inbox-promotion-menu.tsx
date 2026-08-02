'use client'

import { useState } from 'react'

import {
  DashboardIconCalendar,
  DashboardIconCheckSquare,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconInfo,
} from '@/features/dashboard/components/dashboard-icons'
import {
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

export function InboxPromotionMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PromotionOption['key'] | null>(null)

  const selectedLabel =
    selectedOption == null
      ? null
      : PROMOTION_OPTIONS.find((option) => option.key === selectedOption)?.title ?? null

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

      {isOpen ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-zinc-200/70 bg-white/90 p-2 shadow-sm">
          {PROMOTION_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = option.key === selectedOption

            return (
              <button
                key={option.key}
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
            )
          })}

          {selectedLabel ? (
            <p className={`px-1 pt-1 ${aosWorkspaceMetaClassName}`}>
              {selectedLabel} ausgewählt. Promotion folgt im nächsten Schritt.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
