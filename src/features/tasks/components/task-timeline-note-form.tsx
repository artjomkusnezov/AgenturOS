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
  'w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

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
    <form action={formAction} className="mt-1">
      <input type="hidden" name="taskId" value={taskId} />

      <div className="flex flex-col gap-2">
        <label htmlFor={`timeline-note-${taskId}`} className="text-xs font-medium text-zinc-500">
          Notiz hinzufügen
        </label>
        <textarea
          ref={textareaRef}
          id={`timeline-note-${taskId}`}
          name="content"
          rows={2}
          disabled={isPending}
          placeholder="Arbeitsvermerk erfassen …"
          className={`${inputClassName} min-h-[3.5rem] resize-y`}
        />
        {state.fieldErrors?.content ? (
          <p className="text-xs text-red-600">{state.fieldErrors.content}</p>
        ) : null}
        {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-60"
        >
          {isPending ? 'Wird gespeichert …' : 'Notiz hinzufügen'}
        </button>
      </div>
    </form>
  )
}
