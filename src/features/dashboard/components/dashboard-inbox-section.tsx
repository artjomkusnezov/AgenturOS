'use client'

import Link from 'next/link'

import { DashboardInboxSourceIcon } from '@/features/dashboard/components/dashboard-inbox-source-icon'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { useDashboardVariant } from '@/features/dashboard/context/dashboard-variant-context'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import {
  formatDashboardDateOrTime,
  splitInboxFeedContent,
} from '@/features/dashboard/lib/dashboard-format'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { getInboxSourceLabel } from '@/features/inbox/lib/inbox-source'
import { resolveInboxAttributionLabel } from '@/features/inbox/lib/resolve-inbox-attribution'
import { isInboxItemUnprocessed } from '@/features/inbox/lib/inbox-status'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { sanitizeDashboardCount } from '@/features/dashboard/lib/dashboard-safe-data'

type DashboardInboxSectionProps = {
  items: InboxItem[]
  memberNameMap?: Record<string, string>
  title?: string
}

function DashboardInboxRow({
  item,
  memberNameMap,
}: {
  item: InboxItem
  memberNameMap: Record<string, string>
}) {
  const variant = useDashboardVariant()
  const surfaces = resolveSurfaceClasses(variant)
  const { title } = splitInboxFeedContent(item.content)
  const timeLabel = formatDashboardDateOrTime(item.created_at)
  const isUnprocessed = isInboxItemUnprocessed(item)
  const creatorName = resolveInboxAttributionLabel(item, memberNameMap)

  return (
    <Link href={`/app/inbox?item=${encodeURIComponent(item.id)}`} className={surfaces.compactRow}>
      <DashboardInboxSourceIcon source={item.source} />
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
          <span>{getInboxSourceLabel(item.source)}</span>
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
}: DashboardInboxSectionProps) {
  const variant = useDashboardVariant()
  const surfaces = resolveSurfaceClasses(variant)
  const totalCount = sanitizeDashboardCount(items.length)
  const previewItems = items.slice(0, 5)
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
    >
      {previewItems.length === 0 ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty message="Keine neuen Eingänge." />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} divide-y ${surfaces.divider} pb-1`}>
          {previewItems.map((item) => (
            <DashboardInboxRow key={item.id} item={item} memberNameMap={memberNameMap} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
