import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  DashboardIconActivity,
  DashboardIconCheckSquare,
  DashboardIconInbox,
  DashboardIconPlusCircle,
} from '@/features/dashboard/components/dashboard-icons'
import { azSurfaceClassName } from '@/features/dashboard/lib/agenturzentrale-surface'

type QuickAction = {
  label: string
  href: string
  icon: ReactNode
  accent: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Eingang',
    href: '/app/inbox',
    icon: <DashboardIconInbox className="h-4 w-4" />,
    accent: 'text-blue-400 bg-blue-500/15 border-blue-500/25',
  },
  {
    label: 'Aufgabe',
    href: '/app/tasks',
    icon: <DashboardIconCheckSquare className="h-4 w-4" />,
    accent: 'text-violet-400 bg-violet-500/15 border-violet-500/25',
  },
  {
    label: 'Vorgang',
    href: '/app/cases',
    icon: <DashboardIconPlusCircle className="h-4 w-4" />,
    accent: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
  },
  {
    label: 'Aktivität',
    href: '/app/activity',
    icon: <DashboardIconActivity className="h-4 w-4" />,
    accent: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
  },
]

const DAY_PHASES = [
  { label: 'Morgen', time: '08–12', active: true },
  { label: 'Mittag', time: '12–14', active: false },
  { label: 'Nachmittag', time: '14–18', active: false },
  { label: 'Abschluss', time: '18+', active: false },
] as const

function getCurrentDayPhaseIndex(): number {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Berlin',
    }).format(new Date()),
  )

  if (hour < 12) return 0
  if (hour < 14) return 1
  if (hour < 18) return 2
  return 3
}

export function AgenturzentraleDayRhythm() {
  const activePhase = getCurrentDayPhaseIndex()

  return (
    <section
      aria-labelledby="day-rhythm-heading"
      className={`${azSurfaceClassName} px-4 py-3.5 sm:px-5 sm:py-4`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2
            id="day-rhythm-heading"
            className="text-[0.8125rem] font-semibold tracking-tight text-[var(--az-text-primary)]"
          >
            Tagesrhythmus
          </h2>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {DAY_PHASES.map((phase, index) => {
              const isActive = index === activePhase
              return (
                <div
                  key={phase.label}
                  className={`rounded-lg border px-2.5 py-1.5 text-center transition-all ${
                    isActive
                      ? 'border-[var(--az-accent-blue)]/40 bg-[var(--az-accent-blue)]/10 shadow-[var(--az-glow-blue)]'
                      : 'border-[var(--az-border-subtle)] bg-transparent opacity-60'
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium ${isActive ? 'text-[var(--az-accent-blue)]' : 'text-[var(--az-text-muted)]'}`}
                  >
                    {phase.label}
                  </p>
                  <p className="text-[9px] tabular-nums text-[var(--az-text-muted)]">{phase.time}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className="mr-1 hidden text-[10px] font-medium uppercase tracking-wide text-[var(--az-text-muted)] sm:inline">
            Schnellzugriff
          </span>
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:scale-[1.02] ${action.accent}`}
            >
              {action.icon}
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
