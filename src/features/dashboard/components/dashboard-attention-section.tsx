import Link from 'next/link'

import { DashboardAvatar } from '@/features/dashboard/components/dashboard-avatar'
import {
  DashboardIconCalendar,
  DashboardIconFlag,
} from '@/features/dashboard/components/dashboard-icons'
import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import type {
  AttentionBucket,
  DashboardAttentionItem,
} from '@/features/dashboard/lib/dashboard-attention'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardMetaIconClassName } from '@/features/dashboard/lib/dashboard-icon-map'
import { dashboardSectionPaddingClassName } from '@/features/dashboard/lib/dashboard-surface'

type DashboardAttentionSectionProps = {
  items: DashboardAttentionItem[]
  totalCount?: number
}

const BUCKET_ORDER: AttentionBucket[] = ['overdue', 'today', 'soon', 'waiting']

const BUCKET_GROUP_LABEL: Record<AttentionBucket, string> = {
  overdue: 'Überfällig',
  today: 'Heute',
  soon: 'Morgen / In Kürze',
  waiting: 'In Bearbeitung',
}

function bucketChipClass(bucket: AttentionBucket): string {
  if (bucket === 'overdue') {
    return 'aos-cockpit-status-chip aos-cockpit-status-chip--overdue'
  }
  if (bucket === 'today') {
    return 'aos-cockpit-status-chip aos-cockpit-status-chip--today'
  }
  if (bucket === 'waiting') {
    return 'aos-cockpit-status-chip aos-cockpit-status-chip--waiting'
  }
  return 'aos-cockpit-status-chip aos-cockpit-status-chip--soon'
}

function DashboardAttentionRow({ item }: { item: DashboardAttentionItem }) {
  const showDue = Boolean(item.dueLabel)
  const showHigh = item.priority === 'high'

  return (
    <Link href={item.href} className="aos-cockpit-row">
      <span
        className={`aos-cockpit-row-accent aos-cockpit-row-accent--${item.bucket}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="aos-cockpit-row-title">{item.title}</span>
        <span className="aos-cockpit-row-meta">
          <span className={bucketChipClass(item.bucket)}>{item.bucketLabel}</span>
          <span>{item.typeLabel}</span>
          {showDue && item.dueLabel ? (
            <span className="inline-flex items-center gap-0.5">
              <DashboardIconCalendar className={dashboardMetaIconClassName} />
              {item.dueLabel}
            </span>
          ) : null}
          {showHigh ? (
            <span className="inline-flex items-center gap-0.5 text-red-400">
              <DashboardIconFlag className={dashboardMetaIconClassName} />
              Hoch
            </span>
          ) : null}
        </span>
      </span>
      {item.assigneeName ? <DashboardAvatar name={item.assigneeName} /> : null}
    </Link>
  )
}

export function DashboardAttentionSection({
  items,
  totalCount,
}: DashboardAttentionSectionProps) {
  const sectionVisual = resolveSectionVisual('attention')
  const count = totalCount ?? items.length
  const preview = items.slice(0, 4)

  const groups = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: preview.filter((item) => item.bucket === bucket),
  })).filter((group) => group.items.length > 0)

  return (
    <DashboardSection
      title="Was ist jetzt wichtig?"
      titleId="dashboard-attention-heading"
      href="/app/cases"
      hrefLabel="Alle Vorgänge anzeigen"
      className="aos-cockpit-panel aos-cockpit-work-card aos-cockpit-work-card--attention"
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
      headerExtra={
        count > 0 ? (
          <span className="aos-cockpit-count-chip aos-cockpit-count-chip--orange">{count}</span>
        ) : null
      }
    >
      {preview.length === 0 ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Aktuell nichts Dringendes." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-2 pb-1`}>
          {groups.map((group) => (
            <div key={group.bucket}>
              <p className={`aos-cockpit-group-label aos-cockpit-group-label--${group.bucket}`}>
                {BUCKET_GROUP_LABEL[group.bucket]}
              </p>
              <div className="divide-y divide-zinc-100/80">
                {group.items.map((item) => (
                  <DashboardAttentionRow key={item.caseId} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
