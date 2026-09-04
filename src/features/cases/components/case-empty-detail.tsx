import { DashboardIconBriefcase } from '@/features/dashboard/components/dashboard-icons'

export function CaseEmptyDetail() {
  return (
    <div className="aos-ws-empty-detail">
      <span className="aos-ws-empty-icon" aria-hidden="true">
        <DashboardIconBriefcase className="h-5 w-5" />
      </span>
      <h2 className="aos-ws-empty-title">Kein Vorgang ausgewählt</h2>
      <p className="aos-ws-empty-copy">
        Wähle links einen Vorgang aus, um Details, Aufgaben und Verlauf zu öffnen.
      </p>
    </div>
  )
}
