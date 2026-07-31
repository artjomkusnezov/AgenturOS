'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { updateTaskAssigneeAction } from '@/features/tasks/actions/update-task-assignee-action'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import type { TaskMutationState } from '@/features/tasks/types/task'

type TaskAssigneeSelectProps = {
  taskId: string
  assigneeUserId: string | null
  members: AgencyMember[]
}

const initialState: TaskMutationState = {}

const selectClassName =
  'min-h-11 w-full rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-colors duration-150 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:opacity-60'

export function TaskAssigneeSelect({
  taskId,
  assigneeUserId,
  members,
}: TaskAssigneeSelectProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(
    updateTaskAssigneeAction,
    initialState,
  )

  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [state.success, router])

  function handleAssigneeChange() {
    formRef.current?.requestSubmit()
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-2.5 flex flex-col gap-1"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <label htmlFor={`task-assignee-${taskId}`} className="text-xs font-medium text-zinc-600">
        Verantwortlich
      </label>
      <select
        key={`${taskId}-${assigneeUserId ?? 'none'}`}
        id={`task-assignee-${taskId}`}
        name="assigneeUserId"
        defaultValue={assigneeUserId ?? ''}
        disabled={isPending}
        onChange={handleAssigneeChange}
        className={selectClassName}
      >
        <option value="">Nicht zugewiesen</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.displayName}
          </option>
        ))}
      </select>
      {isPending ? (
        <p className="text-xs text-zinc-400">Wird gespeichert …</p>
      ) : null}
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  )
}
