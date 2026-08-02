import Link from 'next/link'

import {
  DashboardIconCalendar,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import type { DashboardTaskItem } from '@/features/dashboard/lib/dashboard-tasks'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import {
  dashboardCompactRowClassName,
  dashboardMetaClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

function dueTone(task: DashboardTaskItem): string {
  if (task.isOverdue) {
    return aosIconAccentDangerClassName
  }
  if (task.isDueToday) {
    return aosIconAccentOrangeClassName
  }
  return 'text-zinc-500'
}

export function DashboardTaskRow({ task }: { task: DashboardTaskItem }) {
  const tone = dueTone(task)
  const showDue = Boolean(task.dueLabel)
  const showHigh = task.priority === 'high'

  return (
    <Link href={task.href} className={dashboardCompactRowClassName}>
      <span
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-zinc-300 ring-2 ring-white"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[0.8125rem] font-medium leading-snug text-zinc-900">
          {task.title}
        </span>
        {(showDue || showHigh) && (
          <span className={dashboardMetaClassName}>
            {showDue && task.dueLabel ? (
              <span className={`inline-flex items-center gap-0.5 ${tone}`}>
                <DashboardIconCalendar className={dashboardMetaIconClassName} />
                {task.dueLabel}
              </span>
            ) : null}
            {showHigh ? (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${aosIconAccentDangerClassName}`}
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
