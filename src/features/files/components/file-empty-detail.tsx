import { DashboardIconFile } from '@/features/dashboard/components/dashboard-icons'

export function FileEmptyDetail() {
  return (
    <div className="aos-ws-empty-detail" aria-label="Keine Datei ausgewählt">
      <span className="aos-ws-empty-icon" aria-hidden="true">
        <DashboardIconFile className="h-5 w-5" />
      </span>
      <h2 className="aos-ws-empty-title">Keine Datei ausgewählt</h2>
      <p className="aos-ws-empty-copy">
        Wähle links eine Datei aus oder lade neue Dateien hoch, um Details zu öffnen.
      </p>
    </div>
  )
}
