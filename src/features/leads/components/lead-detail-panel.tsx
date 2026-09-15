'use client'

import Link from 'next/link'

import { InboxKfzReviewSection } from '@/features/inbox/components/inbox-kfz-review-section'
import { InboxPromotionMenu } from '@/features/inbox/components/inbox-promotion-menu'
import { InboxStatusChip } from '@/features/inbox/components/inbox-status-chip'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { LeadStatusActions } from '@/features/leads/components/lead-status-actions'
import type { KfzLeadDetail } from '@/features/leads/lib/present-kfz-leads'
import type { KfzLeadStatus } from '@/features/leads/lib/kfz-lead-status'
import {
  aosPanelHeaderClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type LeadDetailPanelProps = {
  item: InboxItem
  detail: KfzLeadDetail
  onBack?: () => void
  onStatusChange: () => void
  onLocalApply?: (status: KfzLeadStatus) => void
}

export function LeadDetailPanel({
  item,
  detail,
  onBack,
  onStatusChange,
  onLocalApply,
}: LeadDetailPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className={aosPanelHeaderClassName}>
        {onBack ? (
          <button type="button" onClick={onBack} className={`${aosWorkspaceActionClassName} lg:hidden`}>
            Zurück zur Liste
          </button>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className={`min-w-0 truncate text-base font-semibold ${aosWsTextPrimaryClassName}`}>
            {detail.customerName}
          </h2>
          <InboxStatusChip label={detail.statusLabel} kind={detail.statusKind} />
        </div>
        <p className={aosWorkspaceMetaClassName}>Eingegangen {detail.receivedAtLabel}</p>
      </header>

      <div className="space-y-4 px-4 py-4">
        <section className={aosWorkspaceSectionClassName} aria-label="Nächster Schritt">
          <p className={`text-sm ${aosWsTextPrimaryClassName}`}>{detail.nextAction}</p>
          <p className={`mt-1 ${aosWorkspaceMetaClassName}`}>{detail.noAutoVorgang}</p>
        </section>

        <LeadStatusActions
          item={item}
          currentStatus={detail.status}
          onStatusChange={onStatusChange}
          onLocalApply={onLocalApply}
        />

        <InboxKfzReviewSection review={detail.review} />

        <section className={aosWorkspaceSectionClassName} aria-label="Übernahme in Vorgang">
          <p className={`mb-2 ${aosWorkspaceMetaClassName}`}>
            Übernahme legt nur bei expliziter Aktion einen Vorgang oder eine Aufgabe an.
          </p>
          {onLocalApply ? (
            <p className={aosWorkspaceMetaClassName}>
              Lokale Vorschau: Übernahme bleibt der bestehende Produktionspfad unter Eingang /
              Vorgänge.
            </p>
          ) : (
            <InboxPromotionMenu itemId={item.id} />
          )}
        </section>

        <p>
          <Link href={detail.inboxHref} className="text-sm font-medium text-sky-300 underline-offset-2 hover:underline">
            Dieselbe Anfrage im Eingang öffnen
          </Link>
        </p>
      </div>
    </div>
  )
}
