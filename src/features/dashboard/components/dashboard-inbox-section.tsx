import Link from 'next/link'

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
import {
  dashboardCompactRowClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'

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
  const creatorName = resolveTaskMemberName(item.user_id, memberNameMap)

  return (
    <Link
      href={`/app/inbox?item=${encodeURIComponent(item.id)}`}
      className={dashboardCompactRowClassName}
    >
      <DashboardInboxSourceIcon source={item.source} />
      <span className="min-w-0 flex-1">
        <span
          className={`line-clamp-1 text-[0.8125rem] leading-snug ${
            isUnprocessed ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800'
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span>{getInboxSourceLabel(item.source)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{creatorName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{timeLabel}</span>
        </span>
      </span>
      {isUnprocessed ? (
        <span className="shrink-0 rounded bg-[var(--aos-color-soft-blue-bg)] px-1 py-0.5 text-[9px] font-medium text-[var(--aos-color-soft-blue)]">
          Neu
        </span>
      ) : null}
    </Link>
  )
}

export function DashboardInboxSection({
  items,
  memberNameMap = {},
}: DashboardInboxSectionProps) {
  const totalCount = sanitizeDashboardCount(items.length)
  const previewItems = items.slice(0, 5)
  const sectionVisual = resolveSectionVisual('inbox')
  const title = totalCount > 0 ? `Neue Eingänge (${totalCount})` : 'Neue Eingänge'

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-inbox-heading"
      href="/app/inbox"
      hrefLabel="Alle Eingänge anzeigen"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
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
