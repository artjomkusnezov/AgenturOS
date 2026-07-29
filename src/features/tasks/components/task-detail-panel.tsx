'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteTaskAction } from '@/features/tasks/actions/delete-task'
import { updateTaskAction } from '@/features/tasks/actions/update-task'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'

type TaskDetailPanelProps = {
  task: Task
  onBack?: () => void
  onDeleted: () => void
}

const initialState: TaskMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

export function TaskDetailPanel({
  task,
  onBack,
  onDeleted,
}: TaskDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateTaskAction,
    initialState
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteTaskAction,
    initialState
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handledDeleteRef = useRef(false)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  const isPending = isUpdatePending || isDeletePending

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 px-5 py-4">
        <div className="min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 lg:hidden"
            >
              ← Zurück zur Liste
            </button>
          ) : null}
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
            Aufgabe bearbeiten
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Zuletzt geändert am{' '}
            {new Intl.DateTimeFormat('de-DE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(task.updated_at))}
          </p>
        </div>
      </div>

      <form
        id={updateFormId}
        action={updateAction}
        className="flex flex-1 flex-col"
      >
        <input type="hidden" name="taskId" value={task.id} />

        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`task-title-${task.id}`} className="text-sm font-medium text-zinc-900">
              Titel
            </label>
            <input
              id={`task-title-${task.id}`}
              name="title"
              type="text"
              required
              defaultValue={task.title}
              disabled={isPending}
              className={inputClassName}
            />
            {updateState.fieldErrors?.title ? (
              <p className="text-sm text-red-600">{updateState.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor={`task-description-${task.id}`}
              className="text-sm font-medium text-zinc-900"
            >
              Beschreibung
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id={`task-description-${task.id}`}
              name="description"
              rows={8}
              defaultValue={task.description ?? ''}
              disabled={isPending}
              placeholder="Weitere Details zur Aufgabe …"
              className={`${inputClassName} min-h-[10rem] resize-y`}
            />
          </div>

          {updateState.error ? (
            <p className="text-sm text-red-600">{updateState.error}</p>
          ) : null}
          {updateState.success ? (
            <p className="text-sm text-zinc-600">Änderungen gespeichert.</p>
          ) : null}
        </div>
      </form>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="taskId" value={task.id} />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-5 py-4">
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Aufgabe wirklich löschen?</span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletePending ? 'Wird gelöscht …' : 'Löschen bestätigen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 disabled:opacity-60"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 disabled:opacity-60"
            >
              Aufgabe löschen
            </button>
          )}
          {deleteState.error ? (
            <p className="mt-2 text-sm text-red-600">{deleteState.error}</p>
          ) : null}
        </div>

        <button
          type="submit"
          form={updateFormId}
          disabled={isPending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
        >
          {isUpdatePending ? 'Wird gespeichert …' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
