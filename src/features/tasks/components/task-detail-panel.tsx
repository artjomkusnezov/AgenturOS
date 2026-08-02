'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText, DashboardIconMessage } from '@/features/dashboard/components/dashboard-icons'
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
import { TaskTimelineNoteForm } from '@/features/tasks/components/task-timeline-note-form'
import { resolveTaskMemberName } from '@/features/tasks/lib/resolve-task-member-name'
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import { formatTaskDateTime, isTaskOpen } from '@/features/tasks/lib/task-status'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import type { FileRecord } from '@/features/files/types/file'
import type { InformationItem } from '@/features/information/types/information-item'
import type { Task, TaskMutationState } from '@/features/tasks/types/task'
import type { TaskLinkedFile, TaskLinkedInformation } from '@/features/tasks/types/task-relation'
import type { TaskTimelineEntry } from '@/features/tasks/types/task-timeline'
import {
  aosBtnDangerClassName,
  aosFieldErrorClassName,
  aosInputClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosTextareaClassName,
  aosTextLabelSmClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceActionPrimaryClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWorkspaceSurfaceClassName,
} from '@/lib/design-system'

type TaskDetailPanelProps = {
  task: Task
  timelineEntries: TaskTimelineEntry[]
  linkedFiles: TaskLinkedFile[]
  linkedInformation: TaskLinkedInformation[]
  availableFiles: FileRecord[]
  availableInformation: InformationItem[]
  memberNameMap: Record<string, string>
  agencyMembers: AgencyMember[]
  onBack?: () => void
  onDeleted: () => void
  onWorkflowChange: () => void
}

const initialState: TaskMutationState = {}

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
        className={
          variant === 'complete'
            ? aosWorkspaceActionEmphasisClassName
            : aosWorkspaceActionPrimaryClassName
        }
      >
        {isPending
          ? '…'
          : variant === 'complete'
            ? 'Erledigt'
            : 'Wieder öffnen'}
      </button>
      {state.error ? <p className={`mt-1.5 ${aosFieldErrorClassName}`}>{state.error}</p> : null}
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
  memberNameMap,
  agencyMembers,
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
    <div className={`${aosWorkspaceSurfaceClassName} min-h-[24rem] lg:min-h-0`}>
      <div className={aosPanelHeaderClassName}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center text-xs font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-800 lg:hidden"
          >
            ← Liste
          </button>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-zinc-900">
              {task.title}
            </h2>
            <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${aosWorkspaceMetaClassName}`}>
              <TaskPriorityBadge priority={task.priority} subdued={!isOpen} />
              <TaskDueDateLabel task={task} subdued={!isOpen} />
              <span>{isOpen ? 'Offen' : 'Erledigt'}</span>
              <span className="text-zinc-300">·</span>
              <span>
                {creatorName} · {formatTaskDateTime(task.created_at)}
              </span>
              {task.case_id ? (
                <>
                  <span className="text-zinc-300">·</span>
                  <span>Teil eines Vorgangs</span>
                </>
              ) : null}
            </div>
          </div>

          <WorkflowActionButton
            taskId={task.id}
            variant={isOpen ? 'complete' : 'reopen'}
            onSuccess={onWorkflowChange}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TaskAssigneeSelect
          taskId={task.id}
          assigneeUserId={task.assignee_user_id}
          members={agencyMembers}
        />

        {isEditing ? (
          <form
            id={updateFormId}
            action={updateAction}
            className={aosWorkspaceSectionClassName}
          >
            <input type="hidden" name="taskId" value={task.id} />

            <WorkspaceSectionHeading
              title="Inhalt"
              accent="blue"
              icon={<DashboardIconFileText className="h-4 w-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isPending}
                  className={aosWorkspaceActionClassName}
                >
                  Abbrechen
                </button>
              }
            />

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={`task-title-${task.id}`} className={aosTextLabelSmClassName}>
                  Titel
                </label>
                <input
                  id={`task-title-${task.id}`}
                  name="title"
                  type="text"
                  required
                  defaultValue={task.title}
                  disabled={isPending}
                  className={aosInputClassName}
                />
                {updateState.fieldErrors?.title ? (
                  <p className={aosFieldErrorClassName}>{updateState.fieldErrors.title}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`task-priority-${task.id}`}
                    className={aosTextLabelSmClassName}
                  >
                    Priorität
                  </label>
                  <select
                    id={`task-priority-${task.id}`}
                    name="priority"
                    defaultValue={task.priority}
                    disabled={isPending}
                    className={aosInputClassName}
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                  {updateState.fieldErrors?.priority ? (
                    <p className={aosFieldErrorClassName}>{updateState.fieldErrors.priority}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={`task-due-date-${task.id}`}
                    className={aosTextLabelSmClassName}
                  >
                    Fälligkeitsdatum
                  </label>
                  <input
                    id={`task-due-date-${task.id}`}
                    name="dueDate"
                    type="date"
                    defaultValue={task.due_date ?? ''}
                    disabled={isPending}
                    className={aosInputClassName}
                  />
                  {updateState.fieldErrors?.dueDate ? (
                    <p className={aosFieldErrorClassName}>{updateState.fieldErrors.dueDate}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`task-description-${task.id}`}
                  className={aosTextLabelSmClassName}
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
                  className={`${aosTextareaClassName} min-h-[5rem]`}
                />
              </div>

              {updateState.error ? (
                <p className={aosFieldErrorClassName}>{updateState.error}</p>
              ) : null}
            </div>
          </form>
        ) : (
          <section aria-label="Inhalt" className={aosWorkspaceSectionClassName}>
            <WorkspaceSectionHeading
              title="Inhalt"
              accent="blue"
              icon={<DashboardIconFileText className="h-4 w-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={isPending}
                  className={aosWorkspaceActionClassName}
                >
                  Bearbeiten
                </button>
              }
            />
            {task.description ? (
              <p className="text-[15px] leading-[1.7] whitespace-pre-wrap text-zinc-800">
                {task.description}
              </p>
            ) : (
              <p className={aosWorkspaceMetaClassName}>Keine Beschreibung hinterlegt.</p>
            )}
          </section>
        )}

        <TaskLinkedFiles
          taskId={task.id}
          linkedFiles={linkedFiles}
          availableFiles={availableFiles}
        />
        <TaskLinkedInformationSection
          taskId={task.id}
          linkedInformation={linkedInformation}
          availableInformation={availableInformation}
        />

        <TaskTimeline entries={timelineEntries} memberNameMap={memberNameMap} />

        <section aria-label="Notiz hinzufügen" className={aosWorkspaceSectionClassName}>
          <WorkspaceSectionHeading
            title="Notiz hinzufügen"
            accent="blue"
            icon={<DashboardIconMessage className="h-4 w-4" />}
          />
          <TaskTimelineNoteForm key={timelineEntries.length} taskId={task.id} />
        </section>
      </div>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="taskId" value={task.id} />
      </form>

      <div className={`${aosPanelFooterClassName} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={aosWorkspaceMetaClassName}>Vorgang wirklich löschen?</span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className={aosBtnDangerClassName}
              >
                {isDeletePending ? '…' : 'Löschen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className={aosWorkspaceActionClassName}
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
              Löschen
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
            className={aosWorkspaceActionEmphasisClassName}
          >
            {isUpdatePending ? '…' : 'Speichern'}
          </button>
        ) : updateState.success ? (
          <span className={aosWorkspaceMetaClassName}>Gespeichert.</span>
        ) : null}
      </div>
    </div>
  )
}
