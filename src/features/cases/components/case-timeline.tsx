'use client'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { CaseTimelineEntryView } from '@/features/cases/components/case-timeline-entry'
import type { CaseTimelineEntry } from '@/features/cases/types/case-timeline'
import { DashboardIconActivity } from '@/features/dashboard/components/dashboard-icons'
import {
  aosTimelineClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type CaseTimelineProps = {
  entries: CaseTimelineEntry[]
  memberNameMap: Record<string, string>
}

function formatTimelineDayLabel(isoDate: string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const berlinDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  if (berlinDay.format(date) === berlinDay.format(today)) {
    return 'Heute'
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(date)
}

function groupEntriesByDay(entries: CaseTimelineEntry[]) {
  const groups: { dayKey: string; label: string; entries: CaseTimelineEntry[] }[] =
    []

  for (const entry of entries) {
    const dayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(entry.created_at))

    const last = groups[groups.length - 1]
    if (last && last.dayKey === dayKey) {
      last.entries.push(entry)
    } else {
      groups.push({
        dayKey,
        label: formatTimelineDayLabel(entry.created_at),
        entries: [entry],
      })
    }
  }

  return groups
}

export function CaseTimeline({ entries, memberNameMap }: CaseTimelineProps) {
  const dayGroups = groupEntriesByDay(entries)

  return (
    <section aria-label="Verlauf" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Verlauf"
        accent="blue"
        icon={<DashboardIconActivity className="h-4 w-4" />}
      />

      {entries.length === 0 ? (
        <p className={aosWorkspaceMetaClassName}>Noch keine Einträge vorhanden.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {dayGroups.map((group) => (
            <div key={group.dayKey}>
              <p className={`mb-2.5 ${aosWorkspaceMetaClassName}`}>{group.label}</p>
              <ol className={aosTimelineClassName}>
                {group.entries.map((entry) => (
                  <CaseTimelineEntryView
                    key={entry.id}
                    entry={entry}
                    memberNameMap={memberNameMap}
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
