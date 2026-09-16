'use client'

import Link from 'next/link'

import { InboxStatusChip } from '@/features/inbox/components/inbox-status-chip'
import {
  KFZ_LEAD_STATUS_FILTER_LABELS,
  type KfzLeadRow,
  type KfzLeadStatusFilter,
} from '@/features/leads/lib/present-kfz-leads'
import {
  aosListRowClassName,
  aosListRowHoverClassName,
  aosListSelectedClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type LeadsListProps = {
  rows: KfzLeadRow[]
  selectedItemId: string | null
  statusFilter: KfzLeadStatusFilter
  filterHrefs: Record<KfzLeadStatusFilter, string>
  onSelectItem: (itemId: string) => void
}

const FILTER_ORDER: KfzLeadStatusFilter[] = [
  'open',
  'all',
  'new',
  'contacted',
  'appointment',
  'won',
  'lost',
]

export function LeadsList({
  rows,
  selectedItemId,
  statusFilter,
  filterHrefs,
  onSelectItem,
}: LeadsListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Lead-Statusfilter" className="flex flex-wrap gap-1.5 px-3 pb-2 pt-3">
        {FILTER_ORDER.map((filter) => {
          const active = filter === statusFilter
          return (
            <Link
              key={filter}
              href={filterHrefs[filter]}
              className={`min-h-9 rounded-full px-2.5 text-[11px] font-medium leading-9 ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {KFZ_LEAD_STATUS_FILTER_LABELS[filter]}
            </Link>
          )
        })}
      </nav>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => {
          const selected = row.itemId === selectedItemId
          return (
            <li key={row.itemId}>
              <div
                className={`${aosListRowClassName} items-start py-2 ${
                  selected ? aosListSelectedClassName : aosListRowHoverClassName
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectItem(row.itemId)}
                  aria-current={selected ? 'true' : undefined}
                  className="min-w-0 flex-1 px-3 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p
                      className={`min-w-0 flex-1 truncate text-[13px] leading-snug font-medium ${aosWsTextPrimaryClassName}`}
                    >
                      {row.customerName}
                    </p>
                    <InboxStatusChip label={row.statusLabel} kind={row.statusKind} />
                  </div>
                  <p className={`mt-0.5 truncate text-[11px] leading-none ${aosWsTextMetaClassName}`}>
                    <span>{row.sourceLabel}</span>
                    <span className="mx-1" aria-hidden="true">
                      ·
                    </span>
                    <span>{row.receivedAtListLabel}</span>
                    {row.branchLabel ? (
                      <>
                        <span className="mx-1" aria-hidden="true">
                          ·
                        </span>
                        <span>{row.branchLabel}</span>
                      </>
                    ) : null}
                  </p>
                  <p className={`mt-1 truncate text-[12px] ${aosWsTextMetaClassName}`}>
                    {row.requestSummary}
                  </p>
                  {row.contact ? (
                    <p className={`mt-0.5 truncate text-[12px] ${aosWsTextMetaClassName}`}>
                      {row.contact}
                    </p>
                  ) : null}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
