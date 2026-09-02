'use client'

import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { DashboardTaskRow } from '@/features/dashboard/components/dashboard-task-row'
import { useDashboardVariant } from '@/features/dashboard/context/dashboard-variant-context'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardTaskItem } from '@/features/dashboard/lib/dashboard-tasks'

type DashboardMyTasksSectionProps = {
  tasks: DashboardTaskItem[]
  totalCount: number
  title?: string
}

export function DashboardMyTasksSection({
  tasks,
  totalCount,
  title: customTitle,
}: DashboardMyTasksSectionProps) {
  const variant = useDashboardVariant()
  const surfaces = resolveSurfaceClasses(variant)
  const sectionVisual = resolveSectionVisual('tasks')
  const defaultTitle = totalCount > 0 ? `Meine Aufgaben (${totalCount})` : 'Meine Aufgaben'
  const title = customTitle
    ? totalCount > 0
      ? `${customTitle} (${totalCount})`
      : customTitle
    : defaultTitle

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-my-tasks-heading"
      href="/app/tasks"
      hrefLabel="Alle meine Aufgaben anzeigen"
      className={surfaces.surface}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {tasks.length === 0 ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty message="Keine offenen Aufgaben zugewiesen." />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} divide-y ${surfaces.divider} pb-1`}>
          {tasks.map((task) => (
            <DashboardTaskRow key={task.taskId} task={task} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
