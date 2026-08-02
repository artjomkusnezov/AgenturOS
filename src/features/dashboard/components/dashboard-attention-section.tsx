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
  dashboardMetaClassName,
  dashboardRowClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceEmphasizedClassName,
} from '@/features/dashboard/lib/dashboard-surface'
import {
  aosIconAccentDangerClassName,
  aosIconAccentOrangeClassName,
} from '@/lib/design-system'

type DashboardAttentionSectionProps = {
  items: DashboardAttentionItem[]
  /** Gesamtzahl (kann > items.length sein bei Limit). */
  totalCount?: number
}

function bucketTone(bucket: DashboardAttentionItem['bucket']): string {
  if (bucket === 'overdue') {
    return aosIconAccentDangerClassName
  }
  if (bucket === 'today') {
    return aosIconAccentOrangeClassName
  }
  return 'text-zinc-500'
}

function DashboardAttentionRow({ item }: { item: DashboardAttentionItem }) {
  const tone = bucketTone(item.bucket)
  const showDue = Boolean(item.dueLabel)
  const showHigh = item.priority === 'high'

  return (
    <Link href={item.href} className={dashboardRowClassName}>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[0.9375rem] font-semibold leading-snug text-zinc-900">
          {item.title}
        </span>
        <span className={dashboardMetaClassName}>
          <span className={`font-medium ${tone}`}>{item.bucketLabel}</span>
          <span>{item.typeLabel}</span>
          {showDue && item.dueLabel ? (
            <span className={`inline-flex items-center gap-1 ${tone}`}>
              <DashboardIconCalendar className={dashboardMetaIconClassName} />
              {item.dueLabel}
            </span>
          ) : null}
          {showHigh ? (
            <span
              className={`inline-flex items-center gap-1 font-medium ${aosIconAccentDangerClassName}`}
            >
              <DashboardIconFlag className={dashboardMetaIconClassName} />
              Hoch
            </span>
          ) : null}
          {item.bucket === 'waiting' && !showDue ? (
            <span>{item.statusLabel}</span>
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
      className={dashboardSurfaceEmphasizedClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {items.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Nichts Dringendes. Alle Vorgänge sind im Plan." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-0.5 pb-1`}>
          {items.map((item) => (
            <DashboardAttentionRow key={item.caseId} item={item} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
