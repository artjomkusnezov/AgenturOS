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
  dashboardRowClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceEmphasizedClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

type DashboardInboxSectionProps = {
  items: InboxItem[]
}

function DashboardInboxRow({ item }: { item: InboxItem }) {
  const isUnprocessed = isInboxItemUnprocessed(item)
  const { title, preview } = splitInboxFeedContent(item.content)
  const timeLabel = formatDashboardDateOrTime(item.created_at)

  return (
    <Link href={`/app/inbox?item=${encodeURIComponent(item.id)}`} className={dashboardRowClassName}>
      <DashboardInboxSourceIcon source={item.source} />
      <span className="min-w-0 flex-1">
        <span
          className={`line-clamp-1 text-[0.9375rem] leading-snug ${
            isUnprocessed ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800'
          }`}
        >
          {title}
        </span>
        {preview ? (
          <span className="mt-0.5 line-clamp-1 text-xs leading-snug text-zinc-500">
            {preview}
          </span>
        ) : null}
        <span className="mt-1 block text-[11px] text-zinc-400">
          {getInboxSourceLabel(item.source)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <span className="text-[11px] tabular-nums text-zinc-400">{timeLabel}</span>
        {isUnprocessed ? (
          <span className="rounded-md bg-[var(--aos-color-soft-blue-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--aos-color-soft-blue)]">
            Neu
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export function DashboardInboxSection({ items }: DashboardInboxSectionProps) {
  const totalCount = sanitizeDashboardCount(items.length)
  const previewItems = items.slice(0, 5)
  const sectionVisual = resolveSectionVisual('inbox')
  const title =
    totalCount > 0 ? `Neue Eingänge (${totalCount})` : 'Neue Eingänge'

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-inbox-heading"
      href="/app/inbox"
      hrefLabel="Alle Eingänge anzeigen"
      className={dashboardSurfaceEmphasizedClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {previewItems.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine neuen Eingänge." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-0.5 pb-1`}>
          {previewItems.map((item) => (
            <DashboardInboxRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
