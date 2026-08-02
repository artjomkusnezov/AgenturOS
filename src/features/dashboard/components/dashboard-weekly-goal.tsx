import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import {
  DASHBOARD_WEEKLY_GOAL_DEMO,
  getWeeklyGoalRemaining,
} from '@/features/dashboard/lib/dashboard-weekly-goal-demo'
import {
  dashboardSectionHeaderClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import { aosIconAccentOrangeClassName } from '@/lib/design-system'

function ProgressRing({
  percent,
  current,
  target,
}: {
  percent: number
  current: number
  target: number
}) {
  const size = 84
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div
      className="relative shrink-0"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-label={`Fortschritt Wochenziel: ${current} von ${target}, ${percent} Prozent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--aos-color-soft-orange)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tracking-tight text-zinc-900">{percent}%</span>
      </div>
    </div>
  )
}

export function DashboardWeeklyGoal() {
  const goal = DASHBOARD_WEEKLY_GOAL_DEMO
  const remaining = getWeeklyGoalRemaining(goal.current, goal.target)
  const progressPercent = Math.min(100, Math.round((goal.current / goal.target) * 100))
  const sectionVisual = resolveSectionVisual('weeklyGoal')

  return (
    <section
      aria-labelledby="dashboard-weekly-goal-heading"
      className={`${dashboardSurfaceClassName} flex flex-col`}
    >
      <div
        className={`${dashboardSectionPaddingClassName} flex items-center justify-between gap-3 pt-4`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 ${aosIconAccentOrangeClassName}`} aria-hidden="true">
            {sectionVisual.icon}
          </span>
          <h2 id="dashboard-weekly-goal-heading" className={dashboardSectionHeaderClassName}>
            Wochenaufgabe
          </h2>
        </div>
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
          Diese Woche
        </span>
      </div>

      <div
        className={`${dashboardSectionPaddingClassName} flex flex-col gap-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:pb-4`}
      >
        <ProgressRing
          percent={progressPercent}
          current={goal.current}
          target={goal.target}
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-base font-semibold tracking-tight text-zinc-900">{goal.name}</p>
            <p className="mt-0.5 text-sm leading-snug text-zinc-500">{goal.description}</p>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold tabular-nums text-zinc-900">
              {goal.current} / {goal.target}
            </p>
            <p className="text-sm font-medium text-zinc-700">
              {remaining === 0
                ? 'Ziel erreicht'
                : remaining === 1
                  ? 'Noch 1 bis zum Ziel'
                  : `Noch ${remaining} bis zum Ziel`}
            </p>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--aos-color-soft-orange)',
              }}
            />
          </div>

          <p className="text-[11px] text-zinc-400">
            Demo-Daten — später durch echte Zielwerte ersetzt.
          </p>
        </div>
      </div>
    </section>
  )
}
