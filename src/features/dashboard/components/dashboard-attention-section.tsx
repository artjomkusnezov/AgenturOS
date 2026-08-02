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
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import {
  dashboardAccentBorderOverdue,
  dashboardAccentBorderSoon,
  dashboardAccentBorderToday,
  dashboardMetaClassName,
  dashboardRowClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

type DashboardAttentionSectionProps = {
  items: DashboardAttentionItem[]
  totalCount?: number
}

function accentBorderClass(bucket: DashboardAttentionItem['bucket']): string {
  if (bucket === 'overdue') {
    return dashboardAccentBorderOverdue
  }
  if (bucket === 'today') {
    return dashboardAccentBorderToday
  }
  return dashboardAccentBorderSoon
}

function bucketTone(bucket: DashboardAttentionItem['bucket']): string {
  if (bucket === 'overdue') {
    return aosIconAccentDangerClassName
  }
  if (bucket === 'today') {
    return aosIconAccentOrangeClassName
  }
  return 'text-amber-600'
}

function DashboardAttentionRow({ item }: { item: DashboardAttentionItem }) {
  const tone = bucketTone(item.bucket)
  const showDue = Boolean(item.dueLabel)
  const showHigh = item.priority === 'high'

  return (
    <Link
      href={item.href}
      className={`${dashboardRowClassName} ${accentBorderClass(item.bucket)} pl-2`}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[0.8125rem] font-medium leading-snug text-zinc-900">
          {item.title}
        </span>
        <span className={dashboardMetaClassName}>
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
              className={`inline-flex items-center gap-0.5 font-medium ${aosIconAccentDangerClassName}`}
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
  const sectionVisual = resolveSectionVisual('attention')
  const count = totalCount ?? items.length
  const title = count > 0 ? `Braucht Aufmerksamkeit (${count})` : 'Braucht Aufmerksamkeit'

  return (
    <DashboardSection
      title={title}
      titleId="dashboard-attention-heading"
      href="/app/cases"
      hrefLabel="Alle Vorgänge anzeigen"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {items.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Aktuell braucht kein Vorgang besondere Aufmerksamkeit." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} divide-y divide-zinc-100/80 pb-1`}>
          {items.map((item) => (
            <DashboardAttentionRow key={item.caseId} item={item} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
