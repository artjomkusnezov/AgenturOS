/**
 * Factual operator review for Kfz website inbox items.
 * Not an AI suggestion — derived from the persisted inbound working copy.
 */

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconUser } from '@/features/dashboard/components/dashboard-icons'
import { KFZ_WORK_QUEUE_PHASE_LABELS } from '@/features/inbox/lib/kfz-work-queue'
import type { KfzWebsiteInboxReview } from '@/features/inbox/lib/present-kfz-website-inbox'
import {
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type InboxKfzReviewSectionProps = {
  review: KfzWebsiteInboxReview | null
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <dt className={aosWorkspaceMetaClassName}>{label}</dt>
      <dd className={`text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}>{value}</dd>
    </div>
  )
}

function contactValue(review: KfzWebsiteInboxReview): string {
  const parts: string[] = []
  if (review.phone) {
    parts.push(review.phone)
  }
  if (review.email) {
    parts.push(review.email)
  }
  if (parts.length === 0) {
    return 'Nicht angegeben'
  }
  return parts.join(' · ')
}

export function InboxKfzReviewSection({ review }: InboxKfzReviewSectionProps) {
  if (!review) {
    return null
  }

  return (
    <section aria-label="Kfz-Website-Anfrage" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Kfz-Website-Anfrage"
        accent="orange"
        icon={<DashboardIconUser className="h-4 w-4" />}
      />

      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        Bestand aus dem Eingang · zur menschlichen Prüfung · keine automatische Aktion
      </p>

      <dl className="space-y-3">
        <MetaRow
          label="Quelle"
          value={
            review.acquisitionSource
              ? `${review.sourceLabel} · ${review.acquisitionSource}`
              : review.sourceLabel
          }
        />
        <MetaRow label="Prüfstand" value={KFZ_WORK_QUEUE_PHASE_LABELS[review.phase]} />
        <MetaRow label="Kunde" value={review.customerName} />
        <MetaRow label="Ort" value={review.location ?? 'Nicht angegeben'} />
        <MetaRow label="Kontakt" value={contactValue(review)} />
        <MetaRow label="Bevorzugter Kanal" value={review.preferredChannelLabel} />
        <MetaRow label="Anliegen" value={review.request} />
        <MetaRow label="Fahrzeug" value={review.vehicle ?? 'Nicht angegeben'} />
        <MetaRow
          label="Fehlende Angaben"
          value={
            review.missingInformation.length > 0
              ? review.missingInformation.join(' · ')
              : 'Keine bekannten Lücken in den Angaben'
          }
        />
        <MetaRow label="Hinweis zur Dringlichkeit" value={review.urgencyNote} />
        <MetaRow label="Nächster manueller Schritt" value={review.nextManualAction} />
      </dl>
    </section>
  )
}
