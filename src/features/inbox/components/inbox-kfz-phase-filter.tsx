import Link from 'next/link'

import {
  buildKfzWorkQueueFilterHrefs,
  KFZ_WORK_QUEUE_FILTER_LABELS,
  KFZ_WORK_QUEUE_FILTERS,
  KFZ_WORK_QUEUE_NAV_LABEL,
  sumKfzWorkQueueCounts,
  type KfzWorkQueueCounts,
  type KfzWorkQueueFilter,
  type KfzWorkQueuePhase,
} from '@/features/inbox/lib/kfz-work-queue'

type InboxKfzPhaseFilterProps = {
  activePhase: KfzWorkQueueFilter
  counts: KfzWorkQueueCounts
  selectedItemId?: string | null
  selectedPhase?: KfzWorkQueuePhase | null
  sourceFilter?: string | null
  queueFilter?: string | null
  variant?: 'inbox' | 'dashboard'
  hrefBasePath?: string | null
}

export function InboxKfzPhaseFilter({
  activePhase,
  counts,
  selectedItemId = null,
  selectedPhase = null,
  sourceFilter = null,
  queueFilter = null,
  variant = 'inbox',
  hrefBasePath = null,
}: InboxKfzPhaseFilterProps) {
  const totalKfz = sumKfzWorkQueueCounts(counts)
  if (totalKfz === 0) {
    return null
  }

  const hrefs = buildKfzWorkQueueFilterHrefs({
    selectedItemId,
    selectedPhase,
    source: sourceFilter,
    queue: queueFilter,
    basePath: hrefBasePath,
  })

  return (
    <nav
      aria-label={KFZ_WORK_QUEUE_NAV_LABEL}
      className={variant === 'dashboard' ? 'az-kfz-filter' : 'aos-inbox-phase-filter'}
    >
      <p
        className={
          variant === 'dashboard' ? 'az-kfz-filter-caption' : 'aos-inbox-phase-caption'
        }
      >
        {KFZ_WORK_QUEUE_NAV_LABEL}
      </p>
      {KFZ_WORK_QUEUE_FILTERS.map((filter) => {
        const count = filter === 'all' ? totalKfz : counts[filter]
        const isActive = activePhase === filter

        return (
          <Link
            key={filter}
            href={hrefs[filter]}
            aria-current={isActive ? 'page' : undefined}
            className={
              variant === 'dashboard'
                ? `az-kfz-filter-link${isActive ? ' az-kfz-filter-link--active' : ''}`
                : `aos-inbox-phase-link${isActive ? ' aos-inbox-phase-link--active' : ''}`
            }
          >
            <span>{KFZ_WORK_QUEUE_FILTER_LABELS[filter]}</span>
            <span aria-hidden="true">{count}</span>
          </Link>
        )
      })}
    </nav>
  )
}
