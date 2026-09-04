import { DashboardIconInfo } from '@/features/dashboard/components/dashboard-icons'

export function InformationEmptyDetail() {
  return (
    <div className="aos-ws-empty-detail">
      <span className="aos-ws-empty-icon" aria-hidden="true">
        <DashboardIconInfo className="h-5 w-5" />
      </span>
      <h2 className="aos-ws-empty-title">Keine Information ausgewählt</h2>
      <p className="aos-ws-empty-copy">
        Wähle links eine Information aus, um Inhalt und Anhänge zu öffnen.
      </p>
    </div>
  )
}
