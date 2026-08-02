'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconUser } from '@/features/dashboard/components/dashboard-icons'
import { updateTaskAssigneeAction } from '@/features/tasks/actions/update-task-assignee-action'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import type { TaskMutationState } from '@/features/tasks/types/task'
import {
  aosFieldErrorClassName,
  aosSelectClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type TaskAssigneeSelectProps = {
  taskId: string
  assigneeUserId: string | null
  members: AgencyMember[]
}

const initialState: TaskMutationState = {}

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
    <section aria-label="Verantwortlich" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Verantwortlich"
        accent="green"
        icon={<DashboardIconUser className="h-4 w-4" />}
      />
      <form ref={formRef} action={formAction} className="flex flex-col gap-1.5">
        <input type="hidden" name="taskId" value={taskId} />
        <label htmlFor={`task-assignee-${taskId}`} className="sr-only">
          Verantwortlich
        </label>
        <select
          key={`${taskId}-${assigneeUserId ?? 'none'}`}
          id={`task-assignee-${taskId}`}
          name="assigneeUserId"
          defaultValue={assigneeUserId ?? ''}
          disabled={isPending}
          onChange={handleAssigneeChange}
          className={`${aosSelectClassName} max-w-sm`}
        >
          <option value="">Nicht zugewiesen</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
        {isPending ? <p className={aosWorkspaceMetaClassName}>Wird gespeichert …</p> : null}
        {state.error ? <p className={aosFieldErrorClassName}>{state.error}</p> : null}
      </form>
    </section>
  )
}
