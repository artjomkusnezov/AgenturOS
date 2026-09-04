import Link from 'next/link'

import { DashboardAvatar } from '@/features/dashboard/components/dashboard-avatar'
import {
  DashboardIconCalendar,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardTaskItem } from '@/features/dashboard/lib/dashboard-tasks'
import { dashboardSectionPaddingClassName } from '@/features/dashboard/lib/dashboard-surface'

type DashboardMyTasksSectionProps = {
  tasks: DashboardTaskItem[]
  totalCount: number
  memberNameMap?: Record<string, string>
}

function NextStepFeatured({
  task,
  assigneeName,
}: {
  task: DashboardTaskItem
  assigneeName?: string
}) {
  const statusClass = task.isOverdue
    ? 'aos-cockpit-status-chip aos-cockpit-status-chip--overdue'
    : task.isDueToday
      ? 'aos-cockpit-status-chip aos-cockpit-status-chip--today'
      : 'aos-cockpit-status-chip aos-cockpit-status-chip--soon'

  return (
    <Link href={task.href} className="aos-cockpit-next-step">
      <div className="aos-cockpit-next-step-banner">Nächster Schritt</div>
      <div className="aos-cockpit-next-step-body">
        <span className="aos-cockpit-row-title aos-cockpit-row-title--strong">{task.title}</span>
        <span className="aos-cockpit-row-meta">
          {task.dueLabel ? (
            <span className={statusClass}>
              <DashboardIconCalendar className={dashboardMetaIconClassName} />
              {task.dueLabel}
            </span>
          ) : null}
          {task.priority === 'high' ? (
            <span className="inline-flex items-center gap-0.5 text-red-400">
              <DashboardIconFlag className={dashboardMetaIconClassName} />
              Hoch
            </span>
          ) : null}
          {assigneeName ? <span className="truncate">{assigneeName}</span> : null}
        </span>
        {assigneeName ? (
          <span className="mt-2 inline-flex">
            <DashboardAvatar name={assigneeName} />
          </span>
        ) : null}
      </div>
    </Link>
  )
}

function NextStepRow({ task }: { task: DashboardTaskItem }) {
  const statusClass = task.isOverdue
    ? 'aos-cockpit-status-chip aos-cockpit-status-chip--overdue'
    : task.isDueToday
      ? 'aos-cockpit-status-chip aos-cockpit-status-chip--today'
      : 'aos-cockpit-status-chip aos-cockpit-status-chip--soon'

  return (
    <Link href={task.href} className="aos-cockpit-row">
      <span className="min-w-0 flex-1">
        <span className="aos-cockpit-row-title">{task.title}</span>
        <span className="aos-cockpit-row-meta">
          {task.dueLabel ? <span className={statusClass}>{task.dueLabel}</span> : null}
        </span>
      </span>
    </Link>
  )
}

export function DashboardMyTasksSection({
  tasks,
  totalCount,
  memberNameMap = {},
}: DashboardMyTasksSectionProps) {
  const sectionVisual = resolveSectionVisual('tasks')
  const preview = tasks.slice(0, 3)
  const [featured, ...rest] = preview
  const assigneeName = featured?.assigneeUserId
    ? memberNameMap[featured.assigneeUserId]
    : undefined

  return (
    <DashboardSection
      title="Mein nächster Schritt"
      titleId="dashboard-my-tasks-heading"
      href="/app/tasks"
      hrefLabel="Alle meine Aufgaben anzeigen"
      className="aos-cockpit-panel aos-cockpit-work-card aos-cockpit-work-card--next"
      icon={sectionVisual.icon}
      iconAccent="violet"
      headerExtra={
        totalCount > 0 ? (
          <span className="aos-cockpit-count-chip aos-cockpit-count-chip--violet">{totalCount}</span>
        ) : null
      }
    >
      {preview.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine Priorität bestimmt." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-1.5 pb-1`}>
          {featured ? (
            <NextStepFeatured task={featured} assigneeName={assigneeName} />
          ) : null}
          {rest.length > 0 ? (
            <div className="divide-y divide-zinc-100/80">
              {rest.map((task) => (
                <NextStepRow key={task.taskId} task={task} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </DashboardSection>
  )
}
