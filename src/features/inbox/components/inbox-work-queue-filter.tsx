import Link from 'next/link'

import {
  INBOX_WORK_QUEUE_FILTER_LABELS,
  INBOX_WORK_QUEUE_FILTERS,
  INBOX_WORK_QUEUE_NAV_LABEL,
  type InboxWorkQueueCounts,
  type InboxWorkQueueFilter,
} from '@/features/inbox/lib/inbox-factual-work-queue'

type InboxWorkQueueFilterNavProps = {
  activeQueue: InboxWorkQueueFilter
  counts: InboxWorkQueueCounts
  totalCount: number
  hrefs: Record<InboxWorkQueueFilter, string>
}

export function InboxWorkQueueFilterNav({
  activeQueue,
  counts,
  totalCount,
  hrefs,
}: InboxWorkQueueFilterNavProps) {
  return (
    <nav aria-label={INBOX_WORK_QUEUE_NAV_LABEL} className="aos-inbox-phase-filter">
      <p className="aos-inbox-phase-caption">{INBOX_WORK_QUEUE_NAV_LABEL}</p>
      {INBOX_WORK_QUEUE_FILTERS.map((filter) => {
        const count = filter === 'all' ? totalCount : counts[filter]
        const isActive = activeQueue === filter

        return (
          <Link
            key={filter}
            href={hrefs[filter]}
            aria-current={isActive ? 'page' : undefined}
            className={`aos-inbox-phase-link${isActive ? ' aos-inbox-phase-link--active' : ''}`}
          >
            <span>{INBOX_WORK_QUEUE_FILTER_LABELS[filter]}</span>
            <span aria-hidden="true">{count}</span>
          </Link>
        )
      })}
    </nav>
  )
}
