'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createTaskAction } from '@/features/tasks/actions/create-task'
import type { TaskMutationState } from '@/features/tasks/types/task'
import {
  aosDocBodyClassName,
  aosDocTitleClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceSurfaceClassName,
} from '@/lib/design-system'

type CreateTaskFormProps = {
  onCancel: () => void
  onCreated: (taskId: string) => void
  /** Optional: Aufgabe einem Vorgang zuordnen. */
  caseId?: string | null
}

const initialState: TaskMutationState = {}

export function CreateTaskForm({
  onCancel,
  onCreated,
  caseId = null,
}: CreateTaskFormProps) {
  const [state, formAction, isPending] = useActionState(createTaskAction, initialState)
  const handledSuccessRef = useRef<string | null>(null)

  useEffect(() => {
    if (state.success && state.taskId && handledSuccessRef.current !== state.taskId) {
      handledSuccessRef.current = state.taskId
      onCreated(state.taskId)
    }
  }, [state.success, state.taskId, onCreated])

  return (
    <div className={`${aosWorkspaceSurfaceClassName} min-h-[24rem] lg:min-h-0`}>
      <div className={aosPanelHeaderClassName}>
        <p className="text-[11px] text-zinc-400">Neue Aufgabe</p>
      </div>

      <form action={formAction} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}

        <div className="flex flex-1 flex-col gap-4 px-1 py-4">
          <div>
            <label htmlFor="create-task-title" className="sr-only">
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
              className={aosDocTitleClassName}
            />
            {state.fieldErrors?.title ? (
              <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{state.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col">
            <label htmlFor="create-task-description" className="sr-only">
              Beschreibung (optional)
            </label>
            <textarea
              id="create-task-description"
              name="description"
              rows={10}
              disabled={isPending}
              placeholder="Weitere Details zur Aufgabe …"
              className={`${aosDocBodyClassName} min-h-[12rem]`}
            />
          </div>

          {state.error ? <p className={aosFieldErrorSmClassName}>{state.error}</p> : null}
        </div>

        <div className={`${aosPanelFooterClassName} flex items-center justify-end gap-2`}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={aosWorkspaceActionClassName}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={aosWorkspaceActionEmphasisClassName}
          >
            {isPending ? '…' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
