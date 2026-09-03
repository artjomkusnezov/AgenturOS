import {
  DashboardIconCheckSquare,
  DashboardIconFileText,
  DashboardIconFlag,
  DashboardIconInfo,
  DashboardIconMic,
} from '@/features/dashboard/components/dashboard-icons'

const ACTIONS = [
  { label: 'Notiz', tone: 'blue', icon: DashboardIconFileText },
  { label: 'Aufgabe', tone: 'violet', icon: DashboardIconCheckSquare },
  { label: 'Schaden', tone: 'orange', icon: DashboardIconFlag },
  { label: 'Sprache', tone: 'green', icon: DashboardIconMic },
  { label: 'Info', tone: 'cyan', icon: DashboardIconInfo },
] as const

export function DashboardQuickAccess() {
  return (
    <div className="aos-cockpit-panel aos-cockpit-rail-card">
      <div className="aos-cockpit-rail-body aos-cockpit-rail-body--compact">
        <h2 className="aos-cockpit-rail-title">Schnellzugriff</h2>
        <div className="aos-cockpit-quick-grid">
          {ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                type="button"
                className={`aos-cockpit-quick-btn aos-cockpit-quick-btn--${action.tone}`}
                aria-label={`${action.label} – über + Neu verfügbar`}
              >
                <span className="aos-cockpit-quick-icon" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="aos-cockpit-quick-label">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
