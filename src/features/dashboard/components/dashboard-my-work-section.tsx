import Link from 'next/link'

import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type {
  DashboardCaseTypeCount,
  DashboardMyWorkCaseItem,
} from '@/features/dashboard/lib/dashboard-my-work'
import {
  dashboardCompactRowClassName,
  dashboardMetaClassName,
  dashboardSectionPaddingClassName,
  dashboardSurfaceClassName,
} from '@/features/dashboard/lib/dashboard-surface'

type DashboardMyWorkSectionProps = {
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
}

function RecentCaseRow({ item }: { item: DashboardMyWorkCaseItem }) {
  return (
    <Link href={item.href} className={dashboardCompactRowClassName}>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[0.8125rem] font-medium leading-snug text-zinc-900">
          {item.title}
        </span>
        <span className={dashboardMetaClassName}>
          <span>{item.typeLabel}</span>
          <span>{item.updatedLabel}</span>
        </span>
      </span>
    </Link>
  )
}

export function DashboardMyWorkSection({
  caseTypeCounts,
  recentlyUpdated,
}: DashboardMyWorkSectionProps) {
  const sectionVisual = resolveSectionVisual('myWork')
  const hasContent = caseTypeCounts.length > 0 || recentlyUpdated.length > 0

  return (
    <DashboardSection
      title="Meine Arbeit"
      titleId="dashboard-my-work-heading"
      href="/app/cases"
      hrefLabel="Zum Arbeitsbereich"
      className={dashboardSurfaceClassName}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
    >
      {!hasContent ? (
        <div className={dashboardSectionPaddingClassName}>
          <DashboardSectionEmpty message="Keine offenen Vorgänge unter deiner Verantwortung." />
        </div>
      ) : (
        <div className={`${dashboardSectionPaddingClassName} space-y-3 pb-1`}>
          {caseTypeCounts.length > 0 ? (
            <div>
              <h3
                id="dashboard-my-cases-by-type-heading"
                className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
              >
                Meine offenen Vorgänge
              </h3>
              <ul
                className="mt-1.5 space-y-0.5"
                aria-labelledby="dashboard-my-cases-by-type-heading"
              >
                {caseTypeCounts.map((entry) => (
                  <li
                    key={entry.typeKey}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[0.8125rem]"
                  >
                    <span className="text-zinc-700">{entry.typeLabel}</span>
                    <span className="tabular-nums font-medium text-zinc-900">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {recentlyUpdated.length > 0 ? (
            <div className="border-t border-zinc-100/80 pt-2">
              <h3
                id="dashboard-recent-cases-heading"
                className="px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
              >
                Zuletzt bearbeitet
              </h3>
              <div className="mt-1 divide-y divide-zinc-100/80" aria-labelledby="dashboard-recent-cases-heading">
                {recentlyUpdated.map((item) => (
                  <RecentCaseRow key={item.caseId} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardSection>
  )
}
