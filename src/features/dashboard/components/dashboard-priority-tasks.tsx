'use client'

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

type DashboardPriorityTasksProps = {
  tasks: Task[]
  memberNameMap: Record<string, string>
}

export function DashboardPriorityTasks({
  tasks,
  memberNameMap,
}: DashboardPriorityTasksProps) {
  const sectionVisual = resolveSectionVisual('tasks')

  return (
    <DashboardSection
      title="Heute wichtig"
      titleId="dashboard-tasks-heading"
      href="/app/tasks"
      hrefLabel="Alle Aufgaben anzeigen"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {tasks.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine offenen Aufgaben." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-0.5`}>
          {tasks.map((task) => (
            <DashboardPriorityTaskRow
              key={task.id}
              task={task}
              memberNameMap={memberNameMap}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
