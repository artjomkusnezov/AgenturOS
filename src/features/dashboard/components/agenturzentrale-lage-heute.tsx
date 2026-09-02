import Link from 'next/link'
import type { ReactNode } from 'react'

import { DashboardAccentTile } from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardIconInbox,
  DashboardIconListChecks,
  DashboardIconUsers,
  DashboardIconAlert,
} from '@/features/dashboard/components/dashboard-icons'
import type { DashboardAccent } from '@/features/dashboard/components/dashboard-icons'
import { azSurfaceClassName } from '@/features/dashboard/lib/agenturzentrale-surface'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

type AgenturzentraleLageHeuteProps = {
  unprocessedInboxCount: number
  attentionCount: number
  myOpenTaskCount: number
  teamOpenTaskCount: number
  overdueAttentionCount: number
}

type LageMetric = {
  label: string
  value: string
  detail: string
  href: string
  icon: ReactNode
  accent: DashboardAccent
  glowClass?: string
}

function LageKpi({ metric }: { metric: LageMetric }) {
  return (
    <Link
      href={metric.href}
      className={`${azSurfaceClassName} ${metric.glowClass ?? ''} flex h-full min-h-[5.5rem] items-start gap-3 px-4 py-3.5 transition-transform duration-200 hover:scale-[1.01] sm:gap-3.5 sm:px-5 sm:py-4`}
    >
      <DashboardAccentTile label={metric.label} accent={metric.accent} size="kpi">
        {metric.icon}
      </DashboardAccentTile>
      <div className="min-w-0 pt-0.5">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-[var(--az-text-primary)] sm:text-[1.75rem]">
          {metric.value}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-tight text-[var(--az-text-secondary)]">
          {metric.label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--az-text-muted)]">{metric.detail}</p>
      </div>
    </Link>
  )
}

export function AgenturzentraleLageHeute({
  unprocessedInboxCount,
  attentionCount,
  myOpenTaskCount,
  teamOpenTaskCount,
  overdueAttentionCount,
}: AgenturzentraleLageHeuteProps) {
  const inbox = sanitizeDashboardCount(unprocessedInboxCount)
  const attention = sanitizeDashboardCount(attentionCount)
  const myTasks = sanitizeDashboardCount(myOpenTaskCount)
  const teamTasks = sanitizeDashboardCount(teamOpenTaskCount)
  const overdue = sanitizeDashboardCount(overdueAttentionCount)

  const metrics: LageMetric[] = [
    {
      label: 'Eingang',
      value: String(inbox),
      detail: inbox === 0 ? 'Alles bearbeitet' : inbox === 1 ? '1 offen' : `${inbox} offen`,
      href: '/app/inbox',
      icon: <DashboardIconInbox className="h-5 w-5" />,
      accent: 'blue',
      glowClass: inbox > 0 ? 'az-kpi-glow-blue' : '',
    },
    {
      label: 'Aufmerksamkeit',
      value: String(attention),
      detail:
        overdue > 0
          ? `${overdue} überfällig`
          : attention === 0
            ? 'Alles im Plan'
            : 'Braucht Blick',
      href: '/app/cases',
      icon: <DashboardIconAlert className="h-5 w-5" />,
      accent: 'orange',
      glowClass: overdue > 0 ? 'az-kpi-glow-red' : attention > 0 ? 'az-kpi-glow-amber' : '',
    },
    {
      label: 'Meine Aufgaben',
      value: String(myTasks),
      detail: myTasks === 0 ? 'Keine offenen' : myTasks === 1 ? '1 Aufgabe' : `${myTasks} Aufgaben`,
      href: '/app/tasks',
      icon: <DashboardIconListChecks className="h-5 w-5" />,
      accent: 'violet',
      glowClass: myTasks > 0 ? 'az-kpi-glow-blue' : '',
    },
    {
      label: 'Team',
      value: String(teamTasks),
      detail:
        teamTasks === 0 ? 'Team frei' : teamTasks === 1 ? '1 offen im Team' : `${teamTasks} offen im Team`,
      href: '/app/tasks',
      icon: <DashboardIconUsers className="h-5 w-5" />,
      accent: 'green',
      glowClass: teamTasks > 0 ? 'az-kpi-glow-amber' : '',
    },
  ]

  return (
    <section aria-labelledby="lage-heute-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="lage-heute-heading"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--az-text-muted)]"
        >
          Die Lage heute
        </h2>
        <p className="text-[10px] text-[var(--az-text-muted)]">Live · Echte Daten</p>
      </div>

      <div className="grid grid-cols-2 items-stretch gap-2.5 lg:grid-cols-4 lg:gap-3">
        {metrics.map((metric) => (
          <LageKpi key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  )
}
