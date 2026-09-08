/**
 * Factual operator review for Kfz website inbox items.
 * Submitted facts and missing-information checklist stay separate from AI.
 */

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconUser } from '@/features/dashboard/components/dashboard-icons'
import { KFZ_WORK_QUEUE_PHASE_LABELS } from '@/features/inbox/lib/kfz-work-queue'
import {
  KFZ_REVIEW_AI_SEPARATE_LABEL,
  KFZ_REVIEW_FACT_LABEL,
  type KfzWebsiteInboxReview,
} from '@/features/inbox/lib/present-kfz-website-inbox'
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

function BlockTitle({ children }: { children: string }) {
  return (
    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </h4>
  )
}

export function InboxKfzReviewSection({ review }: InboxKfzReviewSectionProps) {
  if (!review) {
    return null
  }

  return (
    <section aria-label="Kfz-Anfrage" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Kfz-Anfrage"
        accent="orange"
        icon={<DashboardIconUser className="h-4 w-4" />}
        trailing={
          <span
            className={
              review.missingCount > 0 ? 'aos-inbox-chip-gaps' : 'aos-inbox-chip-handled'
            }
          >
            {review.missingCountLabel}
          </span>
        }
      />

      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        {KFZ_REVIEW_FACT_LABEL} · zur menschlichen Prüfung · keine automatische Aktion
      </p>

      <div className="space-y-5">
        <div>
          <BlockTitle>Kurzfassung</BlockTitle>
          <p className={`text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}>
            {review.factualSummary}
          </p>
          <p className={`mt-1.5 ${aosWorkspaceMetaClassName}`}>
            {KFZ_REVIEW_AI_SEPARATE_LABEL}
          </p>
        </div>

        <div>
          <BlockTitle>Eingereichte Angaben</BlockTitle>
          <dl className="space-y-3">
            {review.submittedFacts.map((fact) => (
              <MetaRow key={fact.id} label={fact.label} value={fact.value} />
            ))}
            <MetaRow label="Prüfstand" value={KFZ_WORK_QUEUE_PHASE_LABELS[review.phase]} />
          </dl>
        </div>

        <div>
          <BlockTitle>Fehlende Angaben</BlockTitle>
          <ul aria-label="Prüfliste fehlender Angaben" className="aos-kfz-checklist">
            {review.missingInformationChecklist.map((item) => (
              <li
                key={item.id}
                className={
                  item.present
                    ? 'aos-kfz-check aos-kfz-check--present'
                    : 'aos-kfz-check aos-kfz-check--missing'
                }
              >
                <span aria-hidden="true">{item.present ? '✓' : '○'}</span>
                <span>{item.label}</span>
                <span className="sr-only">{item.present ? 'vorhanden' : 'fehlt'}</span>
              </li>
            ))}
          </ul>
          {review.missingCount === 0 ? (
            <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>
              Keine bekannten Lücken in den Angaben
            </p>
          ) : null}
        </div>

        <dl className="space-y-3">
          <MetaRow label="Hinweis zur Dringlichkeit" value={review.urgencyNote} />
          <MetaRow label="Nächster manueller Schritt" value={review.nextManualAction} />
        </dl>
      </div>
    </section>
  )
}
