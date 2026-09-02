import Link from 'next/link'

import {
  DashboardSection,
  DashboardSectionEmpty,
} from '@/features/dashboard/components/dashboard-section'
import { resolveSurfaceClasses } from '@/features/dashboard/lib/agenturzentrale-surface'
import { resolveSectionVisual } from '@/features/dashboard/lib/dashboard-icon-map'
import type {
  DashboardCaseTypeCount,
  DashboardMyWorkCaseItem,
} from '@/features/dashboard/lib/dashboard-my-work'
import type { DashboardVariant } from '@/features/dashboard/lib/dashboard-variant'

type DashboardMyWorkSectionProps = {
  caseTypeCounts: DashboardCaseTypeCount[]
  recentlyUpdated: DashboardMyWorkCaseItem[]
  title?: string
  variant?: DashboardVariant
}

function RecentCaseRow({
  item,
  variant,
}: {
  item: DashboardMyWorkCaseItem
  variant: DashboardVariant
}) {
  const surfaces = resolveSurfaceClasses(variant)
  const title =
    typeof item.title === 'string' && item.title.trim().length > 0
      ? item.title.trim()
      : 'Ohne Titel'
  const href = typeof item.href === 'string' && item.href.startsWith('/') ? item.href : '/app/cases'

  return (
    <Link href={href} className={surfaces.compactRow}>
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-1 text-[0.8125rem] font-medium leading-snug ${surfaces.titleText}`}>
          {title}
        </span>
        <span className={surfaces.meta}>
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
  title: customTitle = 'Meine Arbeit',
  variant = 'default',
}: DashboardMyWorkSectionProps) {
  const surfaces = resolveSurfaceClasses(variant)
  const sectionVisual = resolveSectionVisual('myWork')
  const safeCaseTypeCounts = Array.isArray(caseTypeCounts) ? caseTypeCounts : []
  const safeRecentlyUpdated = Array.isArray(recentlyUpdated) ? recentlyUpdated : []
  const hasContent = safeCaseTypeCounts.length > 0 || safeRecentlyUpdated.length > 0

  return (
    <DashboardSection
      title={customTitle}
      titleId="dashboard-my-work-heading"
      href="/app/cases"
      hrefLabel="Zum Arbeitsbereich"
      className={surfaces.surface}
      icon={sectionVisual.icon}
      iconAccent={sectionVisual.accent}
      variant={variant}
    >
      {!hasContent ? (
        <div className={surfaces.sectionPadding}>
          <DashboardSectionEmpty
            message="Keine offenen Vorgänge unter deiner Verantwortung."
            variant={variant}
          />
        </div>
      ) : (
        <div className={`${surfaces.sectionPadding} space-y-3 pb-1`}>
          {safeCaseTypeCounts.length > 0 ? (
            <div>
              <h3
                id="dashboard-my-cases-by-type-heading"
                className={`px-1 text-[10px] font-semibold uppercase tracking-wide ${surfaces.subtleText}`}
              >
                Meine offenen Vorgänge
              </h3>
              <ul
                className="mt-1.5 space-y-0.5"
                aria-labelledby="dashboard-my-cases-by-type-heading"
              >
                {safeCaseTypeCounts.map((entry) => (
                  <li
                    key={entry.typeKey}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[0.8125rem]"
                  >
                    <span className={surfaces.bodyText}>{entry.typeLabel}</span>
                    <span className={`tabular-nums font-medium ${surfaces.titleText}`}>
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {safeRecentlyUpdated.length > 0 ? (
            <div
              className={`border-t pt-2 ${
                variant === 'agenturzentrale'
                  ? 'border-[var(--az-border-subtle)]'
                  : 'border-zinc-100/80'
              }`}
            >
              <h3
                id="dashboard-recent-cases-heading"
                className={`px-1 text-[10px] font-semibold uppercase tracking-wide ${surfaces.subtleText}`}
              >
                Zuletzt bearbeitet
              </h3>
              <div
                className={`mt-1 divide-y ${surfaces.divider}`}
                aria-labelledby="dashboard-recent-cases-heading"
              >
                {safeRecentlyUpdated.map((item) => (
                  <RecentCaseRow key={item.caseId} item={item} variant={variant} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </DashboardSection>
  )
}
