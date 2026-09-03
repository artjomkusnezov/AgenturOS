import type { ReactNode } from 'react'

import { DashboardIconTarget, DashboardIconUser } from '@/features/dashboard/components/dashboard-icons'

function GoalEmpty({
  title,
  icon,
  tone,
}: {
  title: string
  icon: ReactNode
  tone: 'green' | 'blue'
}) {
  return (
    <div
      className={`aos-cockpit-panel aos-cockpit-rail-card aos-cockpit-goal-card aos-cockpit-goal-card--${tone}`}
    >
      <div className="aos-cockpit-rail-body aos-cockpit-rail-body--compact">
        <div className="aos-cockpit-rail-heading">
          <span className="aos-cockpit-lage-icon" aria-hidden="true">
            {icon}
          </span>
          <h2 className="aos-cockpit-rail-title">{title}</h2>
          <span className="aos-cockpit-planned-badge">Geplant</span>
        </div>
        <p className="aos-cockpit-goal-empty">Noch nicht eingerichtet</p>
      </div>
    </div>
  )
}

export function DashboardGoalsSection() {
  return (
    <div className="aos-cockpit-goal-stack">
      <GoalEmpty
        title="Agenturziel"
        tone="green"
        icon={<DashboardIconTarget className="h-4 w-4" />}
      />
      <GoalEmpty
        title="Mein Ziel"
        tone="blue"
        icon={<DashboardIconUser className="h-4 w-4" />}
      />
    </div>
  )
}
