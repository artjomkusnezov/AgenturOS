import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { DashboardTaskRow } from '@/features/dashboard/components/dashboard-task-row'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardTaskItem } from '@/features/dashboard/lib/dashboard-tasks'
import {
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'

type DashboardMyTasksSectionProps = {
  tasks: DashboardTaskItem[]
  totalCount: number
}

export function DashboardMyTasksSection({ tasks, totalCount }: DashboardMyTasksSectionProps) {
  const sectionVisual = resolveSectionVisual('tasks')
  const title =
    totalCount > 0 ? `Meine Aufgaben (${totalCount})` : 'Meine Aufgaben'

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-my-tasks-heading"
      href="/app/tasks"
      hrefLabel="Alle meine Aufgaben anzeigen"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {tasks.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine offenen Aufgaben zugewiesen." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} divide-y divide-zinc-100/80 pb-1`}>
          {tasks.map((task) => (
            <DashboardTaskRow key={task.taskId} task={task} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
