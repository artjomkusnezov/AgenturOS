import Link from 'next/link'

import { DashboardInboxSourceIcon } from '@/features/dashboard/components/dashboard-inbox-source-icon'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import {
  formatDashboardDateOrTime,
  splitInboxFeedContent,
} from '@/features/dashboard/lib/dashboard-format'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { resolveInboxAttributionLabel } from '@/features/inbox/lib/resolve-inbox-attribution'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

type DashboardInboxSectionProps = {
  items: InboxItem[]
  memberNameMap?: Record<string, string>
  title?: string
  variant?: DashboardVariant
}

function DashboardInboxRow({
  item,
  memberNameMap,
  variant,
}: {
  item: InboxItem
  memberNameMap: Record<string, string>
  variant: DashboardVariant
}) {
  const surfaces = resolveSurfaceClasses(variant)
  const content = typeof item.content === 'string' ? item.content : ''
  const { title } = splitInboxFeedContent(content)
  const createdAt = typeof item.created_at === 'string' ? item.created_at : ''
  const timeLabel = formatDashboardDateOrTime(createdAt)
  const isUnprocessed = isInboxItemUnprocessed(item)
  const creatorName = resolveInboxAttributionLabel(item, memberNameMap)
  const itemId = typeof item.id === 'string' ? item.id : ''
  const href = itemId ? `/app/inbox?item=${encodeURIComponent(itemId)}` : '/app/inbox'
  const source: InboxItem['source'] =
    typeof item.source === 'string' && item.source.length > 0
      ? item.source
      : 'manual_text'

  return (
    <Link href={href} className={surfaces.compactRow}>
      <DashboardInboxSourceIcon source={source} />
      <span className="min-w-0 flex-1">
        <span
          className={`line-clamp-1 text-[0.8125rem] leading-snug ${
            isUnprocessed
              ? `font-semibold ${surfaces.titleText}`
              : `font-medium ${surfaces.bodyText}`
          }`}
        >
          {title}
        </span>
        <span className={`mt-0.5 flex items-center gap-1.5 text-[10px] ${surfaces.subtleText}`}>
          <span>{getInboxSourceLabel(source)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{creatorName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{timeLabel}</span>
        </span>
      </span>
      {isUnprocessed ? (
        <span
          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${
            variant === 'agenturzentrale'
              ? 'bg-[var(--az-accent-blue)]/15 text-[var(--az-accent-blue)]'
              : 'bg-[var(--aos-color-soft-blue-bg)] text-[var(--aos-color-soft-blue)]'
          }`}
        >
          Neu
        </span>
      ) : null}
    </Link>
  )
}

export function DashboardInboxSection({
  items,
  memberNameMap = {},
  title: customTitle,
  variant = 'default',
}: DashboardInboxSectionProps) {
  const surfaces = resolveSurfaceClasses(variant)
  const safeItems = Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
  const totalCount = sanitizeDashboardCount(safeItems.length)
  const previewItems = safeItems.slice(0, 5)
  const sectionVisual = resolveSectionVisual('inbox')
  const defaultTitle = totalCount > 0 ? `Neue Eingänge (${totalCount})` : 'Neue Eingänge'
  const title = customTitle
    ? totalCount > 0
      ? `${customTitle} (${totalCount})`
      : customTitle
    : defaultTitle

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-inbox-heading"
      href="/app/inbox"
      hrefLabel="Alle Eingänge anzeigen"
      className={surfaces.surface}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
      variant={variant}
    >
      {previewItems.length === 0 ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty message="Keine neuen Eingänge." variant={variant} />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} divide-y ${surfaces.divider} pb-1`}>
          {previewItems.map((item, index) => (
            <DashboardInboxRow
              key={typeof item.id === 'string' ? item.id : `inbox-${index}`}
              item={item}
              memberNameMap={memberNameMap}
              variant={variant}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
