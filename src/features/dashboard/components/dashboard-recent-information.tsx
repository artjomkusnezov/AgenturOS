import Link from 'next/link'

import { formatInformationDateTime } from '@/features/information/lib/information-status'
import type { InformationItem } from '@/features/information/types/information-item'

type DashboardRecentInformationProps = {
  items: InformationItem[]
}

export function DashboardRecentInformation({ items }: DashboardRecentInformationProps) {
  const previewItems = items.slice(0, 5)

  return (
    <section aria-labelledby="dashboard-recent-information-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="dashboard-recent-information-heading"
          className="text-sm font-semibold tracking-tight text-zinc-900"
        >
          Letzte Informationen
        </h2>
        {items.length > 0 ? (
          <Link
            href="/app/information"
            className="text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900"
          >
            Alle anzeigen
          </Link>
        ) : null}
      </div>

      {previewItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200/80 bg-white/50 px-4 py-5 text-sm text-zinc-500">
          Noch keine Informationen.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200/70 overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
          {previewItems.map((item) => (
            <li key={item.id}>
              <Link
                href={`/app/information?itemId=${item.id}`}
                className="block px-4 py-3 transition-colors duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Geändert am {formatInformationDateTime(item.updated_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
