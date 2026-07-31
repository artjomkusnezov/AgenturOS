'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { createTaskTimelineNoteAction } from '@/features/tasks/actions/create-task-timeline-note-action'
import type { TaskTimelineNoteMutationState } from '@/features/tasks/actions/create-task-timeline-note-action'

type TaskTimelineNoteFormProps = {
  taskId: string
  onSuccess?: () => void
}

const initialState: TaskTimelineNoteMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

export function TaskTimelineNoteForm({
  taskId,
  onSuccess,
}: TaskTimelineNoteFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    createTaskTimelineNoteAction,
    initialState,
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [taskId])

  useEffect(() => {
    if (state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true

      if (textareaRef.current) {
        textareaRef.current.value = ''
      }

      onSuccess?.()
      router.refresh()
    }
  }, [state.success, onSuccess, router])

  return (
    <form action={formAction} className="rounded-lg border border-zinc-200/70 bg-zinc-50/40 p-4">
      <input type="hidden" name="taskId" value={taskId} />

      <div className="flex flex-col gap-2">
        <label htmlFor={`timeline-note-${taskId}`} className="text-sm font-medium text-zinc-900">
          Notiz hinzufügen
        </label>
        <textarea
          ref={textareaRef}
          id={`timeline-note-${taskId}`}
          name="content"
          rows={3}
          disabled={isPending}
          placeholder="Arbeitsvermerk erfassen …"
          className={`${inputClassName} min-h-[5rem] resize-y`}
        />
        {state.fieldErrors?.content ? (
          <p className="text-sm text-red-600">{state.fieldErrors.content}</p>
        ) : null}
        {state.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
        >
          {isPending ? 'Wird gespeichert …' : 'Notiz hinzufügen'}
        </button>
      </div>
    </form>
  )
}
