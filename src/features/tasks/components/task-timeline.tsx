'use client'

import { useEffect, useRef } from 'react'

import { TaskTimelineEntryView } from '@/features/tasks/components/task-timeline-entry'
import { TaskTimelineNoteForm } from '@/features/tasks/components/task-timeline-note-form'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

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
    <section aria-label="Arbeitschronik" className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Arbeitschronik
      </h3>

      {entries.length === 0 ? (
        <p className="text-xs text-zinc-400">Noch keine Einträge vorhanden.</p>
      ) : (
        <ol className="ml-1 space-y-4 border-l border-zinc-200 pl-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <TaskTimelineEntryView entry={entry} memberNameMap={memberNameMap} />
            </li>
          ))}
        </ol>
      )}

      <div ref={endRef} aria-hidden="true" />

      <TaskTimelineNoteForm
        key={noteFormKey}
        taskId={taskId}
        onSuccess={handleNoteSuccess}
      />
    </section>
  )
}
