'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { completeTaskAction } from '@/features/tasks/actions/complete-task'
import { deleteTaskAction } from '@/features/tasks/actions/delete-task'
import { reopenTaskAction } from '@/features/tasks/actions/reopen-task'
import { updateTaskAction } from '@/features/tasks/actions/update-task'
import { TaskDueDateLabel } from '@/features/tasks/components/task-due-date-label'
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge'
import { TaskTimeline } from '@/features/tasks/components/task-timeline'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import { formatTaskDateTime, isTaskOpen } from '@/features/tasks/lib/task-status'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

type TaskDetailPanelProps = {
  task: Task
  timelineEntries: TaskTimelineEntry[]
  memberNameMap: Record<string, string>
  onBack?: () => void
  onDeleted: () => void
  onWorkflowChange: () => void
}

const initialState: TaskMutationState = {}

const inputClassName =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-zinc-200/50 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

function WorkflowActionButton({
  taskId,
  variant,
  onSuccess,
}: {
  taskId: string
  variant: 'complete' | 'reopen'
  onSuccess: () => void
}) {
  const action = variant === 'complete' ? completeTaskAction : reopenTaskAction
  const [state, formAction, isPending] = useActionState(action, initialState)
  const handledRef = useRef(false)

  useEffect(() => {
    handledRef.current = false
  }, [taskId, variant])

  useEffect(() => {
    if (state.success && !handledRef.current) {
      handledRef.current = true
      onSuccess()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        disabled={isPending}
        className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-150 disabled:opacity-60 ${
          variant === 'complete'
            ? 'bg-accent text-white hover:bg-accent/90'
            : 'border border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-50'
        }`}
      >
        {isPending
          ? variant === 'complete'
            ? 'Wird erledigt …'
            : 'Wird geöffnet …'
          : variant === 'complete'
            ? 'Als erledigt markieren'
            : 'Wieder öffnen'}
      </button>
      {state.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
    </form>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-800">{value}</dd>
    </div>
  )
}

export function TaskDetailPanel({
  task,
  timelineEntries,
  memberNameMap,
  onBack,
  onDeleted,
  onWorkflowChange,
}: TaskDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateTaskAction,
    initialState,
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteTaskAction,
    initialState,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handledDeleteRef = useRef(false)
  const isOpen = isTaskOpen(task)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  const isPending = isUpdatePending || isDeletePending
  const creatorName = resolveTaskMemberName(task.created_by, memberNameMap)
  const assigneeName = resolveTaskMemberName(task.assignee_user_id, memberNameMap)

  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-zinc-200/60 bg-white lg:min-h-0">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 px-5 py-4">
        <div className="min-w-0 flex-1">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 lg:hidden"
            >
              ← Zurück zur Liste
            </button>
          ) : null}
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Vorgang</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TaskPriorityBadge priority={task.priority} subdued={!isOpen} />
            <TaskDueDateLabel task={task} subdued={!isOpen} />
            <span className="text-xs text-zinc-500">{isOpen ? 'Offen' : 'Erledigt'}</span>
          </div>
        </div>

        <WorkflowActionButton
          taskId={task.id}
          variant={isOpen ? 'complete' : 'reopen'}
          onSuccess={onWorkflowChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-zinc-200/70 px-5 py-4">
          <dl className="grid gap-4 sm:grid-cols-3">
            <MetaItem label="Ersteller" value={creatorName} />
            <MetaItem label="Verantwortlich" value={assigneeName} />
            <MetaItem
              label="Erstellt am"
              value={formatTaskDateTime(task.created_at)}
            />
          </dl>
        </div>

        <form id={updateFormId} action={updateAction} className="border-b border-zinc-200/70">
          <input type="hidden" name="taskId" value={task.id} />

          <div className="flex flex-col gap-4 px-5 py-5">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`task-priority-${task.id}`}
                  className="text-sm font-medium text-zinc-900"
                >
                  Priorität
                </label>
                <select
                  id={`task-priority-${task.id}`}
                  name="priority"
                  defaultValue={task.priority}
                  disabled={isPending}
                  className={inputClassName}
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {TASK_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
                {updateState.fieldErrors?.priority ? (
                  <p className="text-sm text-red-600">{updateState.fieldErrors.priority}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`task-due-date-${task.id}`}
                  className="text-sm font-medium text-zinc-900"
                >
                  Fälligkeitsdatum
                  <span className="font-normal text-zinc-500"> (optional)</span>
                </label>
                <input
                  id={`task-due-date-${task.id}`}
                  name="dueDate"
                  type="date"
                  defaultValue={task.due_date ?? ''}
                  disabled={isPending}
                  className={inputClassName}
                />
                {updateState.fieldErrors?.dueDate ? (
                  <p className="text-sm text-red-600">{updateState.fieldErrors.dueDate}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
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
                rows={5}
                defaultValue={task.description ?? ''}
                disabled={isPending}
                placeholder="Weitere Details zum Vorgang …"
                className={`${inputClassName} min-h-[7rem] resize-y`}
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

        <div className="px-5 py-5">
          <TaskTimeline
            taskId={task.id}
            entries={timelineEntries}
            memberNameMap={memberNameMap}
            noteFormKey={timelineEntries.length}
          />
        </div>
      </div>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="taskId" value={task.id} />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-5 py-4">
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-600">Vorgang wirklich löschen?</span>
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
              Vorgang löschen
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
