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
import { getInboxListTitle } from '@/features/inbox/lib/format-inbox-content'
import { getInboxItemSourceLabel } from '@/features/inbox/lib/inbox-source'
import {
  buildInboxHref,
  countKfzWorkQueue,
  presentInboxStatusChip,
  presentKfzWorkQueueRow,
  resolveInboxLinkedTaskId,
  type KfzWorkQueueCounts,
} from '@/features/inbox/lib/kfz-work-queue'
import { resolveInboxAttributionLabel } from '@/features/inbox/lib/resolve-inbox-attribution'
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
  memberNameMap,
  linkedTaskId,
}: {
  item: InboxItem
  memberNameMap: Record<string, string>
  linkedTaskId: string | null
}) {
  const title = getInboxListTitle(item)
  const timeLabel = formatDashboardDateOrTime(item.created_at)
  const isUnprocessed = isInboxItemUnprocessed(item)
  const creatorName = resolveInboxAttributionLabel(item, memberNameMap)
  const statusChip = presentInboxStatusChip(item, linkedTaskId)
  const queueRow = presentKfzWorkQueueRow(item, { linkedTaskId })

  return (
    <Link
      href={buildInboxHref({ itemId: item.id })}
      className="aos-cockpit-row"
    >
      <DashboardInboxSourceIcon item={item} />
      <span className="min-w-0 flex-1">
        <span className={`aos-cockpit-row-title ${isUnprocessed ? 'aos-cockpit-row-title--strong' : ''}`}>
          {title}
        </span>
        <span className="aos-cockpit-row-meta">
          <span>{getInboxItemSourceLabel(item)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{creatorName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{timeLabel}</span>
          {queueRow ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{queueRow.requestFacts}</span>
              {queueRow.hasFactualUrgency ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Dringlich</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{queueRow.missingCountLabel}</span>
            </>
          ) : null}
        </span>
      </span>
      {statusChip ? (
        <InboxStatusChip label={statusChip.label} kind={statusChip.kind} surface="cockpit" />
      ) : null}
      {creatorName ? <DashboardAvatar name={creatorName} /> : null}
    </Link>
  )
}

export function DashboardInboxSection({
  items,
  memberNameMap = {},
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
              memberNameMap={memberNameMap}
              linkedTaskId={resolveInboxLinkedTaskId(item.id, taskRelationsByItemId)}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
