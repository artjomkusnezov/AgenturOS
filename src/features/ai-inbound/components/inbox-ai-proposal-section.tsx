/**
 * Internal-only Inbox section for AI analysis proposals (Kfz website leads).
 * Visibly labeled as KI-Vorschlag / Entwurf — never auto-sends or mutates.
 */

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import {
  AI_PROPOSAL_BADGE_LABEL,
  labelIntent,
  labelPurchaseIntent,
  labelUrgency,
} from '@/features/ai-inbound/lib/format-proposal-labels'
import type { InboxAiProposal } from '@/features/ai-inbound/types'
import {
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type InboxAiProposalSectionProps = {
  proposal: InboxAiProposal | null | undefined
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <dt className={aosWorkspaceMetaClassName}>{label}</dt>
      <dd className={`text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}>{value}</dd>
    </div>
  )
}

export function InboxAiProposalSection({ proposal }: InboxAiProposalSectionProps) {
  if (!proposal || proposal.status === 'not_applicable') {
    return null
  }

  return (
    <section aria-label="KI-Vorschlag" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="KI-Vorschlag"
        accent="violet"
        icon={<DashboardIconFileText className="h-4 w-4" />}
      />

      <p className={`mb-3 text-xs font-medium tracking-wide text-zinc-500`}>
        {AI_PROPOSAL_BADGE_LABEL} · nur intern · keine automatische Kundenaktion ·
        getrennt von den eingereichten Angaben
      </p>

      {proposal.status === 'unavailable' ? (
        <div className="space-y-1">
          <p className={`text-sm ${aosWsTextPrimaryClassName}`}>{proposal.message}</p>
          <p className={aosWorkspaceMetaClassName}>
            Status: nicht erzeugt ({proposal.reason})
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposal.usedFallback ? (
            <p className={aosWorkspaceMetaClassName}>
              Sichere Rückfallebene aktiv
              {proposal.fallbackReason ? ` — ${proposal.fallbackReason}` : ''}.
            </p>
          ) : null}

          <dl className="space-y-3">
            <MetaRow label="Kurzfassung" value={proposal.suggestion.summary} />
            <MetaRow
              label="Kategorie"
              value={labelIntent(proposal.suggestion.intent)}
            />
            <MetaRow label="Produkt" value={proposal.suggestion.productTopic} />
            <MetaRow
              label="Dringlichkeit"
              value={labelUrgency(proposal.suggestion.urgency)}
            />
            <MetaRow
              label="Abschlussimpuls"
              value={labelPurchaseIntent(proposal.suggestion.purchaseIntent)}
            />
            <MetaRow
              label="Fehlende Infos (Vorschlag)"
              value={
                proposal.suggestion.missingInformation.length > 0
                  ? proposal.suggestion.missingInformation.join(' · ')
                  : 'Keine bekannten Lücken im Vorschlag'
              }
            />
            <MetaRow
              label="Nächster Schritt"
              value={
                proposal.suggestion.suggestedTask
                  ? `${proposal.suggestion.suggestedTask.title} — ${proposal.suggestion.suggestedTask.reason}`
                  : 'Kein Schritt vorgeschlagen'
              }
            />
            <MetaRow
              label="Menschliche Übernahme"
              value={
                proposal.suggestion.humanReviewRequired
                  ? `Ja — ${proposal.suggestion.humanReviewReason ?? 'Bitte manuell prüfen.'}`
                  : 'Nicht erforderlich (weiterhin menschliche Entscheidung)'
              }
            />
          </dl>

          {proposal.suggestion.suggestedReplyDraft ? (
            <div className="space-y-1.5">
              <p className={aosWorkspaceMetaClassName}>Antwortentwurf (nicht gesendet)</p>
              <p
                className={`whitespace-pre-wrap rounded-md border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm leading-relaxed ${aosWsTextPrimaryClassName}`}
              >
                {proposal.suggestion.suggestedReplyDraft}
              </p>
              <p className={aosWorkspaceMetaClassName}>
                Entwurf / Vorschlag — nicht automatisch an den Kunden gesendet.
              </p>
            </div>
          ) : (
            <p className={aosWorkspaceMetaClassName}>Kein Antwortentwurf erzeugt.</p>
          )}

          <p className={aosWorkspaceMetaClassName}>
            Quelle: {proposal.sourceLabel}
            {proposal.providerId ? ` · ${proposal.providerId}` : ''}
          </p>
        </div>
      )}
    </section>
  )
}
