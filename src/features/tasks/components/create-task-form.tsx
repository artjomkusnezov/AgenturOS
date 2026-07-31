'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createTaskAction } from '@/features/tasks/actions/create-task'
import type { TaskMutationState } from '@/features/tasks/types/task'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosCardPanelClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosPanelFooterClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

type CreateTaskFormProps = {
  onCancel: () => void
  onCreated: (taskId: string) => void
}

const initialState: TaskMutationState = {}

export function CreateTaskForm({ onCancel, onCreated }: CreateTaskFormProps) {
  const [state, formAction, isPending] = useActionState(createTaskAction, initialState)
  const handledSuccessRef = useRef<string | null>(null)

  useEffect(() => {
    if (state.success && state.taskId && handledSuccessRef.current !== state.taskId) {
      handledSuccessRef.current = state.taskId
      onCreated(state.taskId)
    }
  }, [state.success, state.taskId, onCreated])

  return (
    <div className={`${aosCardPanelClassName} h-full`}>
      <div className="border-b border-zinc-200/70 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Neue Aufgabe
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Erfassen Sie Titel und optional eine Beschreibung.
        </p>
      </div>

      <form action={formAction} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="create-task-title" className={aosTextLabelClassName}>
              Titel
            </label>
            <input
              id="create-task-title"
              name="title"
              type="text"
              required
              autoFocus
              disabled={isPending}
              placeholder="Was soll erledigt werden?"
              className={aosInputClassName}
            />
            {state.fieldErrors?.title ? (
              <p className={aosFieldErrorSmClassName}>{state.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="create-task-description"
              className={aosTextLabelClassName}
            >
              Beschreibung
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id="create-task-description"
              name="description"
              rows={8}
              disabled={isPending}
              placeholder="Weitere Details zur Aufgabe …"
              className={`${aosTextareaClassName} min-h-[10rem]`}
            />
          </div>

          {state.error ? (
            <p className={aosFieldErrorSmClassName}>{state.error}</p>
          ) : null}
        </div>

        <div className={`${aosPanelFooterClassName} flex items-center justify-end gap-2`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={aosBtnGhostLgClassName}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={aosBtnPrimaryLgClassName}
          >
            {isPending ? 'Wird erstellt …' : 'Aufgabe erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
