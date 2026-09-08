import Link from 'next/link'

import {
  INBOX_SOURCE_FILTER_LABELS,
  INBOX_SOURCE_FILTER_NAV_LABEL,
  INBOX_SOURCE_FILTERS,
  type InboxSourceFilter,
  type InboxSourceFilterCounts,
} from '@/features/inbox/lib/inbox-source-filter'

type InboxSourceFilterNavProps = {
  activeSource: InboxSourceFilter
  counts: InboxSourceFilterCounts
  hrefs: Record<InboxSourceFilter, string>
}

export function InboxSourceFilterNav({
  activeSource,
  counts,
  hrefs,
}: InboxSourceFilterNavProps) {
  return (
    <nav aria-label={INBOX_SOURCE_FILTER_NAV_LABEL} className="aos-inbox-phase-filter">
      <p className="aos-inbox-phase-caption">{INBOX_SOURCE_FILTER_NAV_LABEL}</p>
      {INBOX_SOURCE_FILTERS.map((filter) => {
        const isActive = activeSource === filter

        return (
          <Link
            key={filter}
            href={hrefs[filter]}
            aria-current={isActive ? 'page' : undefined}
            className={`aos-inbox-phase-link${isActive ? ' aos-inbox-phase-link--active' : ''}`}
          >
            <span>{INBOX_SOURCE_FILTER_LABELS[filter]}</span>
            <span aria-hidden="true">{counts[filter]}</span>
          </Link>
        )
      })}
    </nav>
  )
}
