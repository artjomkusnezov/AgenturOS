import {
  DashboardIconAlert,
  DashboardIconBriefcase,
  DashboardIconInbox,
  DashboardIconInfo,
} from '@/features/dashboard/components/dashboard-icons'

type DashboardLageStripProps = {
  inboxCount: number
  attentionCount: number
  activeCaseCount: number
}

export function DashboardLageStrip({
  inboxCount,
  attentionCount,
  activeCaseCount,
}: DashboardLageStripProps) {
  return (
    <section className="aos-cockpit-lage" aria-label="Die Lage heute">
      <article className="aos-cockpit-lage-slot aos-cockpit-lage-slot--blue">
        <div className="aos-cockpit-lage-top">
          <span className="aos-cockpit-lage-icon" aria-hidden="true">
            <DashboardIconInbox className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="aos-cockpit-lage-label">Neue Eingänge</span>
        </div>
        <span className="aos-cockpit-lage-value">{inboxCount}</span>
        <span className="aos-cockpit-lage-detail">
          {inboxCount === 0 ? 'Eingang ist leer' : 'Noch zu sichten'}
        </span>
      </article>

      <article className="aos-cockpit-lage-slot aos-cockpit-lage-slot--orange">
        <div className="aos-cockpit-lage-top">
          <span className="aos-cockpit-lage-icon" aria-hidden="true">
            <DashboardIconAlert className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="aos-cockpit-lage-label">Braucht Aufmerksamkeit</span>
        </div>
        <span className="aos-cockpit-lage-value">{attentionCount}</span>
        <span className="aos-cockpit-lage-detail">
          {attentionCount === 0 ? 'Nichts dringend' : 'Fristen & Prioritäten'}
        </span>
      </article>

      <article className="aos-cockpit-lage-slot aos-cockpit-lage-slot--violet">
        <div className="aos-cockpit-lage-top">
          <span className="aos-cockpit-lage-icon" aria-hidden="true">
            <DashboardIconBriefcase className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="aos-cockpit-lage-label">Aktive Vorgänge</span>
        </div>
        <span className="aos-cockpit-lage-value">{activeCaseCount}</span>
        <span className="aos-cockpit-lage-detail">Offen / in Arbeit</span>
      </article>

      <article className="aos-cockpit-lage-slot aos-cockpit-lage-slot--cyan">
        <div className="aos-cockpit-lage-top">
          <span className="aos-cockpit-lage-icon" aria-hidden="true">
            <DashboardIconInfo className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="aos-cockpit-lage-label">Letzte Information</span>
        </div>
        <span className="aos-cockpit-lage-value aos-cockpit-lage-empty">–</span>
        <span className="aos-cockpit-lage-detail">Noch keine Information verfügbar</span>
      </article>
    </section>
  )
}
