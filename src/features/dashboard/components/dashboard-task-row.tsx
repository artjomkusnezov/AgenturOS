'use client'

import Link from 'next/link'

import {
  DashboardIconCalendar,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import type { DashboardTaskItem } from '@/features/dashboard/lib/dashboard-tasks'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import { useDashboardVariant } from '@/features/dashboard/context/dashboard-variant-context'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

function dueTone(task: DashboardTaskItem, variant: 'default' | 'agenturzentrale'): string {
  if (task.isOverdue) {
    return variant === 'agenturzentrale' ? 'text-red-400' : aosIconAccentDangerClassName
  }
  if (task.isDueToday) {
    return variant === 'agenturzentrale' ? 'text-orange-400' : aosIconAccentOrangeClassName
  }
  return variant === 'agenturzentrale' ? 'text-[var(--az-text-muted)]' : 'text-zinc-500'
}

export function DashboardTaskRow({ task }: { task: DashboardTaskItem }) {
  const variant = useDashboardVariant()
  const surfaces = resolveSurfaceClasses(variant)
  const tone = dueTone(task, variant)
  const showDue = Boolean(task.dueLabel)
  const showHigh = task.priority === 'high'

  return (
    <Link href={task.href} className={surfaces.compactRow}>
      <span
        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ring-2 ${
          variant === 'agenturzentrale'
            ? 'bg-[var(--az-accent-blue)]/60 ring-[var(--az-bg-panel)]'
            : 'bg-zinc-300 ring-white'
        }`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-1 text-[0.8125rem] font-medium leading-snug ${surfaces.titleText}`}>
          {task.title}
        </span>
        {(showDue || showHigh) && (
          <span className={surfaces.meta}>
            {showDue && task.dueLabel ? (
              <span className={`inline-flex items-center gap-0.5 ${tone}`}>
                <DashboardIconCalendar className={dashboardMetaIconClassName} />
                {task.dueLabel}
              </span>
            ) : null}
            {showHigh ? (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  variant === 'agenturzentrale' ? 'text-red-400' : aosIconAccentDangerClassName
                }`}
              >
                <DashboardIconFlag className={dashboardMetaIconClassName} />
                Hoch
              </span>
            ) : null}
          </span>
        )}
      </span>
    </Link>
  )
}
