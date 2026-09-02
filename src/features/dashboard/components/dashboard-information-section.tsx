'use client'

import Link from 'next/link'

import { DashboardAccentTile } from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import {
  formatDashboardDateOrTime,
  getDisplayInitials,
} from '@/features/dashboard/lib/dashboard-format'
import {
  resolveInformationVisual,
  resolveSectionVisual,
} from '@/features/dashboard/lib/dashboard-icon-map'
import {
  dashboardRowClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import type { InformationItem } from '@/features/information/types/information-item'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'

type DashboardInformationSectionProps = {
  items: InformationItem[]
  memberNameMap: Record<string, string>
}

function shortPreview(content: string | null): string | null {
  if (!content) {
    return null
  }
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return null
  }
  if (normalized.length <= 56) {
    return normalized
  }
  return `${normalized.slice(0, 56).trimEnd()}…`
}

function DashboardInformationRow({
  item,
  memberNameMap,
}: {
  item: InformationItem
  memberNameMap: Record<string, string>
}) {
  const preview = shortPreview(item.content)
  const authorName = resolveTaskMemberName(item.user_id, memberNameMap)
  const isTeamInfo =
    authorName !== 'Unbekanntes Mitglied' && authorName !== 'Nicht zugewiesen'
  const visual = resolveInformationVisual(isTeamInfo)
  const timeLabel = formatDashboardDateOrTime(item.updated_at)

  return (
    <Link href={`/app/information?itemId=${item.id}`} className={dashboardRowClassName}>
      {isTeamInfo ? (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--aos-color-soft-violet-bg)] text-[10px] font-semibold text-[var(--aos-color-soft-violet)]"
          title={authorName}
          aria-hidden="true"
        >
          {getDisplayInitials(authorName)}
        </span>
      ) : (
        <DashboardAccentTile label={visual.label} accent={visual.accent} size="sm">
          {visual.icon}
        </DashboardAccentTile>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-medium text-zinc-900 group-hover:text-zinc-950">
          {item.title}
        </span>
        {preview ? (
          <span className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500">
            {preview}
          </span>
        ) : null}
        {isTeamInfo ? (
          <span className="mt-1 block text-[11px] text-zinc-400">{authorName}</span>
        ) : (
          <span className="mt-1 block text-[11px] text-zinc-400">{visual.label}</span>
        )}
      </span>
      <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-zinc-400">
        {timeLabel}
      </span>
    </Link>
  )
}

export function DashboardInformationSection({
  items,
  memberNameMap,
}: DashboardInformationSectionProps) {
  const previewItems = items.slice(0, 3)
  const sectionVisual = resolveSectionVisual('information')

  return (
    <DashboardSection
      title="Team & Informationen"
      titleId="dashboard-information-heading"
      href="/app/information"
      hrefLabel="Alle Informationen anzeigen"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {previewItems.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Noch keine Informationen." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-0.5`}>
          {previewItems.map((item) => (
            <DashboardInformationRow
              key={item.id}
              item={item}
              memberNameMap={memberNameMap}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
