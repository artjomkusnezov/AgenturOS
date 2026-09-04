import { DashboardIconUser } from '@/features/dashboard/components/dashboard-icons'

export function ContactEmptyDetail() {
  return (
    <div className="aos-ws-empty-detail">
      <span className="aos-ws-empty-icon" aria-hidden="true">
        <DashboardIconUser className="h-5 w-5" />
      </span>
      <h2 className="aos-ws-empty-title">Kein Kontakt ausgewählt</h2>
      <p className="aos-ws-empty-copy">
        Wähle links einen Kontakt aus, um Details zu öffnen.
      </p>
    </div>
  )
}
