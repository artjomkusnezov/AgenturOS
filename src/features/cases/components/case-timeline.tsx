'use client'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { CaseTimelineComposer } from '@/features/cases/components/case-timeline-composer'
import { CaseTimelineEntryView } from '@/features/cases/components/case-timeline-entry'
import type { CaseTimelineEntryView as CaseTimelineEntryViewModel } from '@/features/cases/types/case-timeline'
import { DashboardIconActivity } from '@/features/dashboard/components/dashboard-icons'
import {
  aosTimelineClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type CaseTimelineProps = {
  caseId: string
  entries: CaseTimelineEntryViewModel[]
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

function groupEntriesByDay(entries: CaseTimelineEntryViewModel[]) {
  const groups: {
    dayKey: string
    label: string
    entries: CaseTimelineEntryViewModel[]
  }[] = []

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

export function CaseTimeline({ caseId, entries, memberNameMap }: CaseTimelineProps) {
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

      <CaseTimelineComposer key={entries.length} caseId={caseId} />
    </section>
  )
}
