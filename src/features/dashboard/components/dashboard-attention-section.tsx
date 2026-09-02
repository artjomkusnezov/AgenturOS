import Link from 'next/link'

import {
  DashboardIconCalendar,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import type { DashboardAttentionItem } from '@/features/dashboard/lib/dashboard-attention'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

type DashboardAttentionSectionProps = {
  items: DashboardAttentionItem[]
  totalCount?: number
  variant?: DashboardVariant
}

function accentBorderClass(
  bucket: DashboardAttentionItem['bucket'],
  variant: DashboardVariant,
): string {
  const surfaces = resolveSurfaceClasses(variant)
  if (bucket === 'overdue') {
    return surfaces.accentBorderOverdue
  }
  if (bucket === 'today') {
    return surfaces.accentBorderToday
  }
  return surfaces.accentBorderSoon
}

function bucketTone(bucket: DashboardAttentionItem['bucket'], variant: DashboardVariant): string {
  if (variant === 'agenturzentrale') {
    if (bucket === 'overdue') return 'text-red-400'
    if (bucket === 'today') return 'text-orange-400'
    return 'text-amber-400'
  }
  if (bucket === 'overdue') {
    return aosIconAccentDangerClassName
  }
  if (bucket === 'today') {
    return aosIconAccentOrangeClassName
  }
  return 'text-amber-600'
}

function DashboardAttentionRow({
  item,
  variant,
}: {
  item: DashboardAttentionItem
  variant: DashboardVariant
}) {
  const surfaces = resolveSurfaceClasses(variant)
  const tone = bucketTone(item.bucket, variant)
  const showDue = Boolean(item.dueLabel)
  const showHigh = item.priority === 'high'
  const title =
    typeof item.title === 'string' && item.title.trim().length > 0
      ? item.title.trim()
      : 'Ohne Titel'
  const href = typeof item.href === 'string' && item.href.startsWith('/') ? item.href : '/app/cases'

  return (
    <Link
      href={href}
      className={`${surfaces.row} ${accentBorderClass(item.bucket, variant)} pl-2`}
    >
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-1 text-[0.8125rem] font-medium leading-snug ${surfaces.titleText}`}>
          {title}
        </span>
        <span className={surfaces.meta}>
          <span className={`font-medium ${tone}`}>{item.bucketLabel}</span>
          <span>{item.typeLabel}</span>
          {showDue && item.dueLabel ? (
            <span className={`inline-flex items-center gap-0.5 ${tone}`}>
              <DashboardIconCalendar className={dashboardMetaIconClassName} />
              {item.dueLabel}
            </span>
          ) : null}
          <span>{item.assigneeName}</span>
          {showHigh ? (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                variant === 'agenturzentrale' ? 'text-red-400' : aosIconAccentDangerClassName
              }`}
            >
              <DashboardIconFlag className={dashboardMetaIconClassName} />
              Hoch
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

export function DashboardAttentionSection({
  items,
  totalCount,
  variant = 'default',
}: DashboardAttentionSectionProps) {
  const surfaces = resolveSurfaceClasses(variant)
  const sectionVisual = resolveSectionVisual('attention')
  const safeItems = Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : []
  const count = totalCount ?? safeItems.length
  const title = count > 0 ? `Braucht Aufmerksamkeit (${count})` : 'Braucht Aufmerksamkeit'

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-attention-heading"
      href="/app/cases"
      hrefLabel="Alle Vorgänge anzeigen"
      className={surfaces.surface}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
      variant={variant}
    >
      {safeItems.length === 0 ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty
            message="Aktuell braucht kein Vorgang besondere Aufmerksamkeit."
            variant={variant}
          />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} divide-y ${surfaces.divider} pb-1`}>
          {safeItems.map((item, index) => (
            <DashboardAttentionRow
              key={typeof item.caseId === 'string' ? item.caseId : `attention-${index}`}
              item={item}
              variant={variant}
            />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
