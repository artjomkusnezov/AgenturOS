import { DashboardAccentTile } from '@/features/dashboard/components/dashboard-icons'
import { resolveOverviewVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { DASHBOARD_WEEKLY_GOAL_DEMO } from '@/features/dashboard/lib/dashboard-weekly-goal-demo'
import { dashboardSurfaceClassName } from '@/features/dashboard/lib/dashboard-surface'

type DashboardOverviewStripProps = {
  unprocessedInboxCount: number
  openTaskCount: number
  overdueTaskCount: number
  informationCount: number
}

type OverviewMetricProps = {
  overviewKey: 'inbox' | 'tasks' | 'information' | 'weeklyGoal'
  value: string
  detail: string
}

function OverviewMetric({ overviewKey, value, detail }: OverviewMetricProps) {
  const visual = resolveOverviewVisual(overviewKey)

  return (
    <div
      className={`${dashboardSurfaceClassName} flex h-full items-start gap-3 px-4 py-3.5 sm:gap-3.5 sm:px-5 sm:py-4`}
    >
      <DashboardAccentTile label={visual.label} accent={visual.accent} size="kpi">
        {visual.icon}
      </DashboardAccentTile>
      <div className="min-w-0 pt-0.5">
        <p className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
          {value}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-tight text-zinc-800">
          {visual.label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{detail}</p>
      </div>
    </div>
  )
}

export function DashboardOverviewStrip({
  unprocessedInboxCount,
  openTaskCount,
  overdueTaskCount,
  informationCount,
}: DashboardOverviewStripProps) {
  const goal = DASHBOARD_WEEKLY_GOAL_DEMO

  const inboxDetail =
    unprocessedInboxCount === 0
      ? 'Alles bearbeitet'
      : unprocessedInboxCount === 1
        ? '1 offen zur Bearbeitung'
        : `${unprocessedInboxCount} offen zur Bearbeitung`

  const tasksDetail =
    overdueTaskCount > 0
      ? `${overdueTaskCount} überfällig`
      : openTaskCount === 0
        ? 'Keine offenen Aufgaben'
        : 'Keine überfälligen Aufgaben'

  const informationDetail =
    informationCount === 1
      ? '1 gespeicherte Information'
      : `${informationCount} gespeicherte Informationen`

  return (
    <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4 lg:gap-3.5">
      <OverviewMetric
        overviewKey="inbox"
        value={String(unprocessedInboxCount)}
        detail={inboxDetail}
      />
      <OverviewMetric
        overviewKey="tasks"
        value={String(openTaskCount)}
        detail={tasksDetail}
      />
      <OverviewMetric
        overviewKey="information"
        value={String(informationCount)}
        detail={informationDetail}
      />
      <OverviewMetric
        overviewKey="weeklyGoal"
        value={`${goal.current}/${goal.target}`}
        detail={goal.name}
      />
    </div>
  )
}
