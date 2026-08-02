import Link from 'next/link'

import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { DashboardPriorityTaskRow } from '@/features/dashboard/components/dashboard-priority-task-row'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import {
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import type { Task } from '@/features/tasks/types/task'
import type { WorkspaceView } from '@/features/workspace-views/types/workspace-view'
import { aosTextMetaClassName } from '@/lib/design-system'

export type DashboardViewBucket = {
  view: WorkspaceView
  count: number
  priorityTasks: Task[]
}

type DashboardViewBucketsProps = {
  buckets: DashboardViewBucket[]
  memberNameMap: Record<string, string>
}

export function DashboardViewBuckets({
  buckets,
  memberNameMap,
}: DashboardViewBucketsProps) {
  const sectionVisual = resolveSectionVisual('tasks')
  const tasksBucket = buckets.find((bucket) => bucket.view.key === 'tasks')
  const otherBuckets = buckets.filter((bucket) => bucket.view.key !== 'tasks')

  return (
    <div className="space-y-4">
      <DashboardSection
        title="Heute wichtig"
        titleId="dashboard-tasks-heading"
        href={tasksBucket ? `/app/cases?view=${encodeURIComponent(tasksBucket.view.key)}` : '/app/tasks'}
        hrefLabel="Alle Aufgaben anzeigen"
        className={dashboardSurfaceClassName}
        icon={sectionVisual.icon}
        iconAccent={sectionVisual.accent}
      >
        {!tasksBucket || tasksBucket.priorityTasks.length === 0 ? (
          <div className={dashboardSectionPaddingClassName}>
            <DashboardSectionEmpty message="Keine offenen Aufgaben." />
          </div>
        ) : (
          <div className={`${dashboardSectionPaddingClassName} space-y-0.5`}>
            {tasksBucket.priorityTasks.map((task) => (
              <DashboardPriorityTaskRow
                key={task.id}
                task={task}
                memberNameMap={memberNameMap}
              />
            ))}
          </div>
        )}
      </DashboardSection>

      {otherBuckets.length > 0 ? (
        <div className={`${dashboardSurfaceClassName} ${dashboardSectionPaddingClassName}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Weitere Vorgänge
          </p>
          <ul className="mt-2 divide-y divide-zinc-100">
            {otherBuckets.map((bucket) => (
              <li key={bucket.view.id}>
                <Link
                  href={`/app/cases?view=${encodeURIComponent(bucket.view.key)}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm text-zinc-800 transition-colors hover:text-zinc-950"
                >
                  <span>{bucket.view.name}</span>
                  <span className={aosTextMetaClassName}>{bucket.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
