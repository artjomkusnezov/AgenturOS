import Link from 'next/link'

import {
  formatActivityTimestamp,
  getActivityDateGroupKey,
} from '@/features/activity/lib/format-activity-date'
import type { TaskActivityItem } from '@/features/activity/types/task-activity'
import { DashboardAccentTile } from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import {
  resolveActivityKindVisual,
  resolveSectionVisual,
} from '@/features/dashboard/lib/dashboard-icon-map'
import {
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'

type DashboardActivityPreviewProps = {
  items: TaskActivityItem[]
}

function DashboardActivityRow({ item }: { item: TaskActivityItem }) {
  const groupKey = getActivityDateGroupKey(item.occurredAt)
  const timestampLabel = formatActivityTimestamp(item.occurredAt, groupKey)
  const visual = resolveActivityKindVisual(item.kind)

  return (
    <Link
      href={item.taskHref}
      className="group flex items-start gap-2.5 rounded-xl px-1.5 py-2 transition-colors duration-150 hover:bg-zinc-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-2"
    >
      <DashboardAccentTile label={visual.label} accent={visual.accent} size="sm">
        {visual.icon}
      </DashboardAccentTile>
      <span className="min-w-0 flex-1">
        <span className="text-[11px] tabular-nums text-zinc-400">{timestampLabel}</span>
        <span className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-zinc-700 group-hover:text-zinc-900">
          {item.summary}
        </span>
        <span className="mt-0.5 block text-[11px] text-zinc-400">{item.actorName}</span>
      </span>
    </Link>
  )
}

export function DashboardActivityPreview({ items }: DashboardActivityPreviewProps) {
  const previewItems = items.slice(0, 3)
  const sectionVisual = resolveSectionVisual('activity')

  return (
    <DashboardSection
      title="Aktivitäten"
      titleId="dashboard-activity-heading"
      href="/app/activity"
      hrefLabel="Alle Aktivitäten anzeigen"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {previewItems.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Noch keine relevanten Aktivitäten." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-0.5`}>
          {previewItems.map((item) => (
            <DashboardActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
