'use client'

import Link from 'next/link'

import {
  DashboardIconCalendar,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { useDashboardVariant } from '@/features/dashboard/context/dashboard-variant-context'
import type { DashboardAttentionItem } from '@/features/dashboard/lib/dashboard-attention'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

type DashboardAttentionSectionProps = {
  items: DashboardAttentionItem[]
  totalCount?: number
}

function accentBorderClass(
  bucket: DashboardAttentionItem['bucket'],
  variant: 'default' | 'agenturzentrale',
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

function bucketTone(bucket: DashboardAttentionItem['bucket'], variant: 'default' | 'agenturzentrale'): string {
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

function DashboardAttentionRow({ item }: { item: DashboardAttentionItem }) {
  const variant = useDashboardVariant()
  const surfaces = resolveSurfaceClasses(variant)
  const tone = bucketTone(item.bucket, variant)
  const showDue = Boolean(item.dueLabel)
  const showHigh = item.priority === 'high'

  return (
    <Link
      href={item.href}
      className={`${surfaces.row} ${accentBorderClass(item.bucket, variant)} pl-2`}
    >
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-1 text-[0.8125rem] font-medium leading-snug ${surfaces.titleText}`}>
          {item.title}
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
}: DashboardAttentionSectionProps) {
  const variant = useDashboardVariant()
  const surfaces = resolveSurfaceClasses(variant)
  const sectionVisual = resolveSectionVisual('attention')
  const count = totalCount ?? items.length
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
    >
      {items.length === 0 ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty message="Aktuell braucht kein Vorgang besondere Aufmerksamkeit." />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} divide-y ${surfaces.divider} pb-1`}>
          {items.map((item) => (
            <DashboardAttentionRow key={item.caseId} item={item} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
