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
    <section aria-label="Arbeitschronik" className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
          Arbeitschronik
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Systemereignisse und manuelle Arbeitsvermerke in chronologischer Reihenfolge.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200/80 bg-zinc-50/50 px-4 py-6 text-sm text-zinc-500">
          Noch keine Einträge vorhanden.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
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
