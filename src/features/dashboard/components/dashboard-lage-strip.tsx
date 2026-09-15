import Link from 'next/link'

import {
  DashboardIconAlert,
  DashboardIconBriefcase,
  DashboardIconInbox,
  DashboardIconTarget,
} from '@/features/dashboard/components/dashboard-icons'
import { KFZ_LEADS_HREF_BASE } from '@/features/leads/lib/present-kfz-leads'

type DashboardLageStripProps = {
  inboxCount: number
  attentionCount: number
  activeCaseCount: number
  openLeadsCount: number
  leadsHref?: string
}

export function DashboardLageStrip({
  inboxCount,
  attentionCount,
  activeCaseCount,
  openLeadsCount,
  leadsHref = KFZ_LEADS_HREF_BASE,
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

      <Link href={leadsHref} className="aos-cockpit-lage-slot aos-cockpit-lage-slot--cyan">
        <div className="aos-cockpit-lage-top">
          <span className="aos-cockpit-lage-icon" aria-hidden="true">
            <DashboardIconTarget className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="aos-cockpit-lage-label">Offene Leads</span>
        </div>
        <span className="aos-cockpit-lage-value">{openLeadsCount}</span>
        <span className="aos-cockpit-lage-detail">
          {openLeadsCount === 0 ? 'Keine offenen Kfz-Leads' : 'Kfz-Anfragen zu qualifizieren'}
        </span>
      </Link>
    </section>
  )
}
