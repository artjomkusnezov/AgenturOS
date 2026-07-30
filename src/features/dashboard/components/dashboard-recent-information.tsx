import Link from 'next/link'

import {
  DashboardPanel,
  DashboardPanelEmpty,
} from '@/features/dashboard/components/dashboard-panel'
import { sanitizeDashboardLabel } from '@/features/dashboard/lib/dashboard-safe-data'
import { formatInformationDateTime } from '@/features/information/lib/information-status'
import type { InformationItem } from '@/features/information/types/information-item'

type DashboardRecentInformationProps = {
  items: InformationItem[]
}

export function DashboardRecentInformation({ items }: DashboardRecentInformationProps) {
  const previewItems = items.slice(0, 5)

  return (
    <DashboardPanel
      title="Letzte Informationen"
      headingId="dashboard-recent-information-heading"
      href={items.length > 0 ? '/app/information' : undefined}
    >
      {previewItems.length === 0 ? (
        <DashboardPanelEmpty
          title="Noch keine Informationen"
          description="Zuletzt bearbeitete Informationen erscheinen hier zum direkten Weiterarbeiten."
        />
      ) : (
        <ul className="divide-y divide-zinc-200/70 overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
          {previewItems.map((item) => {
            const title = sanitizeDashboardLabel(item.title, 'Ohne Titel')
            const updatedLabel = item.updated_at
              ? formatInformationDateTime(item.updated_at)
              : 'Unbekannt'

            return (
              <li key={item.id}>
                <Link
                  href={`/app/information?itemId=${item.id}`}
                  aria-label={`Information öffnen: ${title}, geändert am ${updatedLabel}`}
                  className="block px-4 py-3.5 transition-colors duration-150 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent active:bg-zinc-100/80"
                >
                  <p className="truncate text-sm font-medium text-zinc-900" title={title}>
                    {title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Geändert am {updatedLabel}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardPanel>
  )
}
