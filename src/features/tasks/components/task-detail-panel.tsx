'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { completeTaskAction } from '@/features/tasks/actions/complete-task'
import { deleteTaskAction } from '@/features/tasks/actions/delete-task'
import { reopenTaskAction } from '@/features/tasks/actions/reopen-task'
import { updateTaskAction } from '@/features/tasks/actions/update-task'
import { TaskAssigneeSelect } from '@/features/tasks/components/task-assignee-select'
import { TaskDueDateLabel } from '@/features/tasks/components/task-due-date-label'
import { TaskLinkedFiles } from '@/features/tasks/components/task-linked-files'
import { TaskLinkedInformationSection } from '@/features/tasks/components/task-linked-information'
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge'
import { TaskTimeline } from '@/features/tasks/components/task-timeline'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import { formatTaskDateTime, isTaskOpen } from '@/features/tasks/lib/task-status'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import type { FileRecord } from '@/features/files/types/file'
import type { InformationItem } from '@/features/information/types/information-item'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'
import type { TaskLinkedFile, TaskLinkedInformation } from '@/features/tasks/types/task-relation'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'

type TaskDetailPanelProps = {
  task: Task
  timelineEntries: TaskTimelineEntry[]
  linkedFiles: TaskLinkedFile[]
  linkedInformation: TaskLinkedInformation[]
  availableFiles: FileRecord[]
  availableInformation: InformationItem[]
  selectedFileId?: string | null
  memberNameMap: Record<string, string>
  agencyMembers: AgencyMember[]
  onOpenFile: (fileId: string) => void
  onBack?: () => void
  onDeleted: () => void
  onWorkflowChange: () => void
}

const initialState: TaskMutationState = {}

const inputClassName =
  'w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors duration-150 placeholder:text-zinc-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20'

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
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 disabled:opacity-60 ${
          variant === 'complete'
            ? 'bg-accent text-white hover:bg-accent/90'
            : 'border border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-50'
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
      {state.error ? <p className="mt-1.5 text-xs text-red-600">{state.error}</p> : null}
    </form>
  )
}

export function TaskDetailPanel({
  task,
  timelineEntries,
  linkedFiles,
  linkedInformation,
  availableFiles,
  availableInformation,
  selectedFileId = null,
  memberNameMap,
  agencyMembers,
  onOpenFile,
  onBack,
  onDeleted,
  onWorkflowChange,
}: TaskDetailPanelProps) {
  const router = useRouter()
  const updateFormId = useId()
  const deleteFormId = useId()
  const [isEditing, setIsEditing] = useState(false)
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
  const handledUpdateRef = useRef(false)
  const isOpen = isTaskOpen(task)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  useEffect(() => {
    handledUpdateRef.current = false
  }, [task.id])

  useEffect(() => {
    if (updateState.success && !handledUpdateRef.current) {
      handledUpdateRef.current = true
      setIsEditing(false)
      router.refresh()
    }
  }, [updateState.success, router])

  const isPending = isUpdatePending || isDeletePending
  const creatorName = resolveTaskMemberName(task.created_by, memberNameMap)

  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-zinc-200/60 bg-white lg:min-h-0">
      <div className="shrink-0 border-b border-zinc-200/70 px-4 py-3 lg:px-5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 lg:hidden"
          >
            ← Zurück zur Liste
          </button>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug tracking-tight text-zinc-900">
              {task.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TaskPriorityBadge priority={task.priority} subdued={!isOpen} />
              <TaskDueDateLabel task={task} subdued={!isOpen} />
              <span className="text-xs text-zinc-400">{isOpen ? 'Offen' : 'Erledigt'}</span>
            </div>
          </div>

          <WorkflowActionButton
            taskId={task.id}
            variant={isOpen ? 'complete' : 'reopen'}
            onSuccess={onWorkflowChange}
          />
        </div>

        <p className="mt-2.5 text-xs text-zinc-500">
          {creatorName} · {formatTaskDateTime(task.created_at)}
        </p>

        <TaskAssigneeSelect
          taskId={task.id}
          assigneeUserId={task.assignee_user_id}
          members={agencyMembers}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isEditing ? (
          <form
            id={updateFormId}
            action={updateAction}
            className="shrink-0 border-b border-zinc-200/70 px-4 py-4 lg:px-5"
          >
            <input type="hidden" name="taskId" value={task.id} />

            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Bearbeiten
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
                className="text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-800 disabled:opacity-60"
              >
                Abbrechen
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={`task-title-${task.id}`} className="text-xs font-medium text-zinc-600">
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
                  <p className="text-xs text-red-600">{updateState.fieldErrors.title}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`task-priority-${task.id}`}
                    className="text-xs font-medium text-zinc-600"
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
                    <p className="text-xs text-red-600">{updateState.fieldErrors.priority}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`task-due-date-${task.id}`}
                    className="text-xs font-medium text-zinc-600"
                  >
                    Fälligkeitsdatum
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
                    <p className="text-xs text-red-600">{updateState.fieldErrors.dueDate}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`task-description-${task.id}`}
                  className="text-xs font-medium text-zinc-600"
                >
                  Beschreibung
                </label>
                <textarea
                  id={`task-description-${task.id}`}
                  name="description"
                  rows={4}
                  defaultValue={task.description ?? ''}
                  disabled={isPending}
                  placeholder="Weitere Details zum Vorgang …"
                  className={`${inputClassName} min-h-[5rem] resize-y`}
                />
              </div>

              {updateState.error ? (
                <p className="text-xs text-red-600">{updateState.error}</p>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="shrink-0 border-b border-zinc-200/70 px-4 py-3 lg:px-5">
            {task.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">Keine Beschreibung hinterlegt.</p>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
              className="mt-2 text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-800 disabled:opacity-60"
            >
              Bearbeiten
            </button>
          </div>
        )}

        <div className="border-b border-zinc-200/70 px-4 py-4 lg:px-5">
          <TaskTimeline
            taskId={task.id}
            entries={timelineEntries}
            memberNameMap={memberNameMap}
            noteFormKey={timelineEntries.length}
          />
        </div>

        <div className="space-y-0 px-4 pb-4 lg:px-5">
          <TaskLinkedFiles
            taskId={task.id}
            linkedFiles={linkedFiles}
            availableFiles={availableFiles}
            selectedFileId={selectedFileId}
            onOpenFile={onOpenFile}
          />
          <TaskLinkedInformationSection
            taskId={task.id}
            linkedInformation={linkedInformation}
            availableInformation={availableInformation}
          />
        </div>
      </div>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="taskId" value={task.id} />
      </form>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-4 py-3 lg:px-5">
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Vorgang wirklich löschen?</span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletePending ? 'Wird gelöscht …' : 'Löschen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 disabled:opacity-60"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              className="text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-60"
            >
              Vorgang löschen
            </button>
          )}
          {deleteState.error ? (
            <p className="mt-1 text-xs text-red-600">{deleteState.error}</p>
          ) : null}
        </div>

        {isEditing ? (
          <button
            type="submit"
            form={updateFormId}
            disabled={isPending}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
          >
            {isUpdatePending ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        ) : updateState.success ? (
          <span className="text-xs text-zinc-400">Gespeichert.</span>
        ) : null}
      </div>
    </div>
  )
}
