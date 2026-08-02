import Link from 'next/link'
import type { ReactNode } from 'react'

import type { TaskActivityItem } from '@/features/activity/types/task-activity'
import { DashboardActivityPreview } from '@/features/dashboard/components/dashboard-activity-preview'
import { DashboardPriorityTaskRow } from '@/features/dashboard/components/dashboard-priority-task-row'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardMyWorkCaseItem } from '@/features/dashboard/lib/dashboard-my-work'
import {
  dashboardMetaClassName,
  dashboardRowClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import type { Task } from '@/features/tasks/types/task'

type DashboardMyWorkSectionProps = {
  myOpenCases: DashboardMyWorkCaseItem[]
  myOpenTasks: Task[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
  activityItems: TaskActivityItem[]
  memberNameMap: Record<string, string>
}

function MyWorkCaseRow({ item }: { item: DashboardMyWorkCaseItem }) {
  return (
    <Link href={item.href} className={dashboardRowClassName}>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-medium leading-snug text-zinc-900">
          {item.title}
        </span>
        <span className={dashboardMetaClassName}>
          <span>{item.typeLabel}</span>
        </span>
      </span>
    </Link>
  )
}

function MyWorkSubsection({
  title,
  titleId,
  emptyMessage,
  children,
  hasItems,
}: {
  title: string
  titleId: string
  emptyMessage: string
  children: ReactNode
  hasItems: boolean
}) {
  return (
    <div className={`${dashboardSectionPaddingClassName} pb-3`}>
      <h3 id={titleId} className="pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h3>
      {hasItems ? (
        <div className="space-y-0.5" aria-labelledby={titleId}>
          {children}
        </div>
      ) : (
        <DashboardSectionEmpty message={emptyMessage} />
      )}
    </div>
  )
}

export function DashboardMyWorkSection({
  myOpenCases,
  myOpenTasks,
  recentlyUpdated,
  activityItems,
  memberNameMap,
}: DashboardMyWorkSectionProps) {
  const sectionVisual = resolveSectionVisual('myWork')
  const hasAnyWork =
    myOpenCases.length > 0 || myOpenTasks.length > 0 || recentlyUpdated.length > 0

  return (
    <div className="space-y-4">
      <DashboardSection
        title="Meine Arbeit"
        titleId="dashboard-my-work-heading"
        href="/app/cases"
        hrefLabel="Zum Arbeitsbereich"
        className={dashboardSurfaceClassName}
        icon={sectionVisual.icon}
        iconAccent={sectionVisual.accent}
      >
        {!hasAnyWork ? (
          <div className={dashboardSectionPaddingClassName}>
            <DashboardSectionEmpty message="Keine offenen Punkte unter deiner Verantwortung." />
          </div>
        ) : (
          <div className="divide-y divide-zinc-100/80">
            <MyWorkSubsection
              title="Meine offenen Vorgänge"
              titleId="dashboard-my-cases-heading"
              emptyMessage="Keine offenen Vorgänge zugewiesen."
              hasItems={myOpenCases.length > 0}
            >
              {myOpenCases.map((item) => (
                <MyWorkCaseRow key={item.caseId} item={item} />
              ))}
            </MyWorkSubsection>

            <MyWorkSubsection
              title="Meine offenen Aufgaben"
              titleId="dashboard-my-tasks-heading"
              emptyMessage="Keine offenen Aufgaben zugewiesen."
              hasItems={myOpenTasks.length > 0}
            >
              {myOpenTasks.map((task) => (
                <DashboardPriorityTaskRow
                  key={task.id}
                  task={task}
                  memberNameMap={memberNameMap}
                />
              ))}
            </MyWorkSubsection>

            <MyWorkSubsection
              title="Zuletzt bearbeitet"
              titleId="dashboard-recent-heading"
              emptyMessage="Noch keine kürzlichen Änderungen."
              hasItems={recentlyUpdated.length > 0}
            >
              {recentlyUpdated.map((item) => (
                <MyWorkCaseRow key={item.caseId} item={item} />
              ))}
            </MyWorkSubsection>
          </div>
        )}
      </DashboardSection>

      {activityItems.length > 0 ? (
        <div className="opacity-90">
          <DashboardActivityPreview items={activityItems} />
        </div>
      ) : null}
    </div>
  )
}
