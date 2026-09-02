'use client'

import {
  DashboardSection,
} from '@/features/dashboard/components/dashboard-section'
import { DashboardIconTarget } from '@/features/dashboard/components/dashboard-icons'
import {
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'

const GOAL_PLACEHOLDERS = [
  { label: 'Wochenziel' },
  { label: 'Telefonate' },
  { label: 'Aktion' },
] as const

export function DashboardGoalsSection() {
  return (
    <DashboardSection
      title="Ziele"
      titleId="dashboard-goals-heading"
      className={dashboardSurfaceClassName}
      icon={<DashboardIconTarget className="h-[1.125rem] w-[1.125rem]" />}
      iconAccent="green"
    >
      <div className={dashboardSectionPaddingClassName}>
        <div className="rounded-lg bg-[var(--aos-color-soft-green-bg)]/40 px-3 py-3 text-center">
          <DashboardIconTarget className="mx-auto h-5 w-5 text-[var(--aos-color-soft-green)]" />
          <p className="mt-2 text-xs font-medium text-zinc-800">
            Noch keine Ziele eingerichtet.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            Später können hier Wochen-, Vertriebs- und Aktionsziele verfolgt werden.
          </p>
        </div>

        <ul className="mt-3 space-y-1.5" aria-label="Zielplatzhalter">
          {GOAL_PLACEHOLDERS.map((goal) => (
            <li
              key={goal.label}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-zinc-200/80 px-2.5 py-1.5"
            >
              <span className="text-[11px] text-zinc-600">{goal.label}</span>
              <span className="text-[10px] text-zinc-400">Noch nicht eingerichtet</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardSection>
  )
}
