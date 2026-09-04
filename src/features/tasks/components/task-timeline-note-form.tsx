'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { createTaskTimelineNoteAction } from '@/features/tasks/actions/create-task-timeline-note-action'
import type { TaskTimelineNoteMutationState } from '@/features/tasks/actions/create-task-timeline-note-action'
import {
  aosFieldErrorClassName,
  aosTextareaClassName,
  aosWorkspaceActionEmphasisClassName,
} from '@/lib/design-system'

type TaskTimelineNoteFormProps = {
  taskId: string
  onSuccess?: () => void
}

const initialState: TaskTimelineNoteMutationState = {}

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
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />

      <div className="flex flex-col gap-2">
        <label htmlFor={`timeline-note-${taskId}`} className="sr-only">
          Notiz hinzufügen
        </label>
        <textarea
          ref={textareaRef}
          id={`timeline-note-${taskId}`}
          name="content"
          rows={3}
          disabled={isPending}
          placeholder="Arbeitsvermerk erfassen …"
          className={`${aosTextareaClassName} min-h-[4.5rem]`}
        />
        {state.fieldErrors?.content ? (
          <p className={aosFieldErrorClassName}>{state.fieldErrors.content}</p>
        ) : null}
        {state.error ? <p className={aosFieldErrorClassName}>{state.error}</p> : null}
      </div>

      <div className="mt-2.5 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={aosWorkspaceActionEmphasisClassName}
        >
          {isPending ? '…' : 'Notiz hinzufügen'}
        </button>
      </div>
    </form>
  )
}
