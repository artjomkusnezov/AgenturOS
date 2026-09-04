import { DashboardIconInbox } from '@/features/dashboard/components/dashboard-icons'

export function InboxEmptyDetail() {
  return (
    <div className="aos-inbox-empty-detail">
      <span className="aos-inbox-empty-icon" aria-hidden="true">
        <DashboardIconInbox className="h-5 w-5" />
      </span>
      <h2 className="aos-inbox-empty-title">Kein Eingang ausgewählt</h2>
      <p className="aos-inbox-empty-copy">
        Wähle links einen Eingang aus, um Inhalt und Aktionen zu öffnen.
      </p>
    </div>
  )
}
