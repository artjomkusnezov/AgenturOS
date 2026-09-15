import Link from 'next/link'

import { DashboardAvatar } from '@/features/dashboard/components/dashboard-avatar'
import { DashboardInboxSourceIcon } from '@/features/dashboard/components/dashboard-inbox-source-icon'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { formatDashboardDateOrTime } from '@/features/dashboard/lib/dashboard-format'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import { dashboardSectionPaddingClassName } from '@/features/dashboard/lib/dashboard-surface'
import { InboxKfzPhaseFilter } from '@/features/inbox/components/inbox-kfz-phase-filter'
import { InboxStatusChip } from '@/features/inbox/components/inbox-status-chip'
import {
  countKfzWorkQueue,
  resolveInboxLinkedTaskId,
  type KfzWorkQueueCounts,
} from '@/features/inbox/lib/kfz-work-queue'
import { presentUnifiedInboxCard } from '@/features/inbox/lib/present-unified-inbox-card'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type DashboardInboxSectionProps = {
  items: InboxItem[]
  memberNameMap?: Record<string, string>
  taskRelationsByItemId?: Record<string, string>
  kfzQueueCounts?: KfzWorkQueueCounts
}

function DashboardInboxRow({
  item,
  linkedTaskId,
}: {
  item: InboxItem
  linkedTaskId: string | null
}) {
  const card = presentUnifiedInboxCard(item, { linkedTaskId })
  const timeLabel = formatDashboardDateOrTime(card.receivedAt)
  const isUnprocessed = isInboxItemUnprocessed(item)

  return (
    <Link
      href={card.href}
      className="aos-cockpit-row"
    >
      <DashboardInboxSourceIcon item={item} />
      <span className="min-w-0 flex-1">
        <span className={`aos-cockpit-row-title ${isUnprocessed ? 'aos-cockpit-row-title--strong' : ''}`}>
          {card.headline}
        </span>
        <span className="aos-cockpit-row-meta">
          <span>{card.sourceLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{card.customerContact}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{timeLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{card.requestSummary}</span>
          <span aria-hidden="true">·</span>
          <span>{card.missingInformationLabel}</span>
        </span>
      </span>
      <InboxStatusChip
        label={card.reviewStatus.label}
        kind={card.reviewStatus.kind}
        surface="cockpit"
      />
      {card.customerContact ? <DashboardAvatar name={card.customerContact} /> : null}
    </Link>
  )
}

export function DashboardInboxSection({
  items,
  taskRelationsByItemId = {},
  kfzQueueCounts,
}: DashboardInboxSectionProps) {
  const totalCount = sanitizeDashboardCount(items.length)
  const previewItems = items.slice(0, 3)
  const sectionVisual = resolveSectionVisual('inbox')
  const queueCounts = kfzQueueCounts ?? countKfzWorkQueue(items, taskRelationsByItemId)

  return (
    <DashboardSection
      title="Neue Eingänge"
      titleId="dashboard-inbox-heading"
      href="/app/inbox"
      hrefLabel="Alle Eingänge anzeigen"
      className="aos-cockpit-panel aos-cockpit-work-card aos-cockpit-work-card--inbox"
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
      headerExtra={
        totalCount > 0 ? (
          <span className="aos-cockpit-count-chip aos-cockpit-count-chip--blue">{totalCount}</span>
        ) : null
      }
    >
      <div className={`${dashboardSectionPaddingClassName} pb-0`}>
        <InboxKfzPhaseFilter activePhase="all" counts={queueCounts} variant="dashboard" />
      </div>
      {previewItems.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine neuen Eingänge." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} divide-y divide-zinc-100/80 pb-1`}>
          {previewItems.map((item) => (
            <DashboardInboxRow
              key={item.id}
              item={item}
              linkedTaskId={resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
