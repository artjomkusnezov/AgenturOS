import Link from 'next/link'

import {
  buildInboxHref,
  KFZ_WORK_QUEUE_PHASE_LABELS,
  KFZ_WORK_QUEUE_PHASES,
  type KfzWorkQueueCounts,
  type KfzWorkQueueFilter,
  type KfzWorkQueuePhase,
} from '@/features/inbox/lib/kfz-work-queue'

type InboxKfzPhaseFilterProps = {
  activePhase: KfzWorkQueueFilter
  counts: KfzWorkQueueCounts
  selectedItemId?: string | null
  selectedPhase?: KfzWorkQueuePhase | null
  variant?: 'inbox' | 'dashboard'
}

const FILTERS: Array<{ id: KfzWorkQueueFilter; label: string }> = [
  { id: 'all', label: 'Alle' },
  ...KFZ_WORK_QUEUE_PHASES.map((phase) => ({
    id: phase,
    label: KFZ_WORK_QUEUE_PHASE_LABELS[phase],
  })),
]

export function InboxKfzPhaseFilter({
  activePhase,
  counts,
  selectedItemId = null,
  selectedPhase = null,
  variant = 'inbox',
}: InboxKfzPhaseFilterProps) {
  const totalKfz = counts.needs_review + counts.in_review + counts.handled
  if (totalKfz === 0) {
    return null
  }

  return (
    <nav
      aria-label="Kfz-Arbeitsstand"
      className={variant === 'dashboard' ? 'az-kfz-filter' : 'aos-inbox-phase-filter'}
    >
      {FILTERS.map((filter) => {
        const keepItem =
          Boolean(selectedItemId) &&
          (filter.id === 'all' || selectedPhase === filter.id)
        const href = buildInboxHref({
          phase: filter.id,
          itemId: keepItem ? selectedItemId : null,
        })
        const count =
          filter.id === 'all' ? totalKfz : counts[filter.id as KfzWorkQueuePhase]
        const isActive = activePhase === filter.id

        return (
          <Link
            key={filter.id}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={
              variant === 'dashboard'
                ? `az-kfz-filter-link${isActive ? ' az-kfz-filter-link--active' : ''}`
                : `aos-inbox-phase-link${isActive ? ' aos-inbox-phase-link--active' : ''}`
            }
          >
            <span>{filter.label}</span>
            <span aria-hidden="true">{count}</span>
          </Link>
        )
      })}
    </nav>
  )
}
