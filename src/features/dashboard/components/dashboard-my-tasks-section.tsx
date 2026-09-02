import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { DashboardTaskRow } from '@/features/dashboard/components/dashboard-task-row'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardTaskItem } from '@/features/dashboard/lib/dashboard-tasks'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'

type DashboardMyTasksSectionProps = {
  tasks: DashboardTaskItem[]
  totalCount: number
  title?: string
  variant?: DashboardVariant
}

export function DashboardMyTasksSection({
  tasks,
  totalCount,
  title: customTitle,
  variant = 'default',
}: DashboardMyTasksSectionProps) {
  const surfaces = resolveSurfaceClasses(variant)
  const sectionVisual = resolveSectionVisual('tasks')
  const safeTasks = Array.isArray(tasks) ? tasks.filter((task) => task && typeof task === 'object') : []
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
      variant={variant}
    >
      {safeTasks.length === 0 ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty message="Keine offenen Aufgaben zugewiesen." variant={variant} />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} divide-y ${surfaces.divider} pb-1`}>
          {safeTasks.map((task, index) => (
            <DashboardTaskRow
              key={typeof task.taskId === 'string' ? task.taskId : `task-${index}`}
              task={task}
              variant={variant}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
