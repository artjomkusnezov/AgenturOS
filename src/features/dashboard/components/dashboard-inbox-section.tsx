import Link from 'next/link'

import { DashboardAvatar } from '@/features/dashboard/components/dashboard-avatar'
import { DashboardInboxSourceIcon } from '@/features/dashboard/components/dashboard-inbox-source-icon'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import {
  formatDashboardDateOrTime,
  splitInboxFeedContent,
} from '@/features/dashboard/lib/dashboard-format'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import { dashboardSectionPaddingClassName } from '@/features/dashboard/lib/dashboard-surface'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { resolveInboxAttributionLabel } from '@/features/inbox/lib/resolve-inbox-attribution'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type DashboardInboxSectionProps = {
  items: InboxItem[]
  memberNameMap?: Record<string, string>
}

function DashboardInboxRow({
  item,
  memberNameMap,
}: {
  item: InboxItem
  memberNameMap: Record<string, string>
}) {
  const { title } = splitInboxFeedContent(item.content)
  const timeLabel = formatDashboardDateOrTime(item.created_at)
  const isUnprocessed = isInboxItemUnprocessed(item)
  const creatorName = resolveInboxAttributionLabel(item, memberNameMap)

  return (
    <Link
      href={`/app/inbox?item=${encodeURIComponent(item.id)}`}
      className="aos-cockpit-row"
    >
      <DashboardInboxSourceIcon source={item.source} />
      <span className="min-w-0 flex-1">
        <span className={`aos-cockpit-row-title ${isUnprocessed ? 'aos-cockpit-row-title--strong' : ''}`}>
          {title}
        </span>
        <span className="aos-cockpit-row-meta">
          <span>{getInboxSourceLabel(item.source)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{creatorName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{timeLabel}</span>
        </span>
      </span>
      {isUnprocessed ? <span className="aos-cockpit-status-chip aos-cockpit-status-chip--new">Neu</span> : null}
      {creatorName ? <DashboardAvatar name={creatorName} /> : null}
    </Link>
  )
}

export function DashboardInboxSection({
  items,
  memberNameMap = {},
}: DashboardInboxSectionProps) {
  const totalCount = sanitizeDashboardCount(items.length)
  const previewItems = items.slice(0, 3)
  const sectionVisual = resolveSectionVisual('inbox')

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
      {previewItems.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine neuen Eingänge." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} divide-y divide-zinc-100/80 pb-1`}>
          {previewItems.map((item) => (
            <DashboardInboxRow key={item.id} item={item} memberNameMap={memberNameMap} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
