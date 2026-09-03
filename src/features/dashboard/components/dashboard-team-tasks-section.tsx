import { DashboardTaskRow } from '@/features/dashboard/components/dashboard-task-row'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardTeamTasksResult } from '@/features/dashboard/lib/dashboard-tasks'
import {
  dashboardSectionPaddingClassName,
} from '@/features/dashboard/lib/dashboard-surface'

type DashboardTeamTasksSectionProps = {
  teamTasks: DashboardTeamTasksResult
}

function TeamMemberGroup({
  displayName,
  openCount,
  overdueCount,
  previewTasks,
}: {
  displayName: string
  openCount: number
  overdueCount: number
  previewTasks: DashboardTeamTasksResult['members'][number]['previewTasks']
}) {
  return (
    <div className="py-2 first:pt-0">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-xs font-semibold text-zinc-800">{displayName}</h3>
        <span className="text-[10px] tabular-nums text-zinc-400">
          {openCount} offen
          {overdueCount > 0 ? ` · ${overdueCount} überfällig` : ''}
        </span>
      </div>
      <div className="mt-1 divide-y divide-zinc-100/80">
        {previewTasks.map((task) => (
          <DashboardTaskRow key={task.taskId} task={task} />
        ))}
      </div>
    </div>
  )
}

export function DashboardTeamTasksSection({ teamTasks }: DashboardTeamTasksSectionProps) {
  const sectionVisual = resolveSectionVisual('team')
  const totalCount = teamTasks.totalTeamOpenCount
  const title = totalCount > 0 ? `Team (${totalCount})` : 'Team'
  const hasContent =
    teamTasks.members.length > 0 || teamTasks.unassigned.openCount > 0

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-team-tasks-heading"
      href="/app/tasks"
      hrefLabel="Alle Aufgaben anzeigen"
      className="aos-cockpit-panel aos-cockpit-rail-card"
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {!hasContent ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine offenen Team-Aufgaben." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} divide-y divide-zinc-100/80 pb-1`}>
          {teamTasks.members.map((member) => (
            <TeamMemberGroup
              key={member.userId}
              displayName={member.displayName}
              openCount={member.openCount}
              overdueCount={member.overdueCount}
              previewTasks={member.previewTasks}
            />
          ))}

          {teamTasks.unassigned.openCount > 0 ? (
            <TeamMemberGroup
              displayName="Nicht zugeordnet"
              openCount={teamTasks.unassigned.openCount}
              overdueCount={teamTasks.unassigned.overdueCount}
              previewTasks={teamTasks.unassigned.previewTasks}
            />
          ) : null}
        </div>
      )}
    </DashboardSection>
  )
}
