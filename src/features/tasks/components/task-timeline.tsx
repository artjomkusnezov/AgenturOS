'use client'

import { useEffect, useRef } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconActivity, DashboardIconMessage } from '@/features/dashboard/components/dashboard-icons'
import { TaskTimelineEntryView } from '@/features/tasks/components/task-timeline-entry'
import { TaskTimelineNoteForm } from '@/features/tasks/components/task-timeline-note-form'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import {
  aosTimelineClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type TaskTimelineProps = {
  taskId: string
  entries: TaskTimelineEntry[]
  memberNameMap: Record<string, string>
  noteFormKey?: number
}

export function TaskTimeline({
  taskId,
  entries,
  memberNameMap,
  noteFormKey = 0,
}: TaskTimelineProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const shouldScrollRef = useRef(false)

  useEffect(() => {
    if (shouldScrollRef.current && endRef.current) {
      shouldScrollRef.current = false
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [entries.length, noteFormKey])

  const handleNoteSuccess = () => {
    shouldScrollRef.current = true
  }

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

      <div ref={endRef} aria-hidden="true" />

      <div className="mt-2 border-t border-zinc-200/40 pt-4">
        <WorkspaceSectionHeading
          title="Notiz hinzufügen"
          accent="blue"
          icon={<DashboardIconMessage className="h-4 w-4" />}
        />
        <TaskTimelineNoteForm
          key={noteFormKey}
          taskId={taskId}
          onSuccess={handleNoteSuccess}
        />
      </div>
    </section>
  )
}
