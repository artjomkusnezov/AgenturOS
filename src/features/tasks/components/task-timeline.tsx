'use client'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconActivity } from '@/features/dashboard/components/dashboard-icons'
import { TaskTimelineEntryView } from '@/features/tasks/components/task-timeline-entry'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import {
  aosTimelineClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type TaskTimelineProps = {
  entries: TaskTimelineEntry[]
  memberNameMap: Record<string, string>
}

export function TaskTimeline({ entries, memberNameMap }: TaskTimelineProps) {
  return (
    <section aria-label="Arbeitschronik" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Arbeitschronik"
        accent="blue"
        icon={<DashboardIconActivity className="h-4 w-4" />}
      />

      {entries.length === 0 ? (
        <p className={aosWorkspaceMetaClassName}>Noch keine Einträge vorhanden.</p>
      ) : (
        <ol className={aosTimelineClassName}>
          {entries.map((entry) => (
            <TaskTimelineEntryView
              key={entry.id}
              entry={entry}
              memberNameMap={memberNameMap}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
