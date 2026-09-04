'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconInfo } from '@/features/dashboard/components/dashboard-icons'
import { detachTaskInformationAction } from '@/features/tasks/actions/detach-task-information-action'
import { TaskLinkInformationDialog } from '@/features/tasks/components/task-link-information-dialog'
import type { InformationItem } from '@/features/information/types/information-item'
import type {
  TaskLinkedInformation,
  TaskRelationMutationState,
} from '@/features/tasks/types/task-relation'
import {
  aosWorkspaceActionClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWsTextPrimaryClassName,
} from '@/lib/design-system'

type TaskLinkedInformationProps = {
  taskId: string
  linkedInformation: TaskLinkedInformation[]
  availableInformation: InformationItem[]
}

const initialState: TaskRelationMutationState = {}

function DetachInformationButton({
  taskId,
  informationId,
}: {
  taskId: string
  informationId: string
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    detachTaskInformationAction,
    initialState,
  )
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [taskId, informationId])

  useEffect(() => {
    if (state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      router.refresh()
    }
  }, [state.success, router])

  return (
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="informationId" value={informationId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Verknüpfung entfernen"
        className={aosWorkspaceActionClassName}
      >
        {isPending ? '…' : 'Entfernen'}
      </button>
      {state.error ? (
        <p className="mt-0.5 text-[10px] leading-tight text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}

export function TaskLinkedInformationSection({
  taskId,
  linkedInformation,
  availableInformation,
}: TaskLinkedInformationProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <section aria-label="Informationen" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Informationen"
        accent="violet"
        count={linkedInformation.length}
        icon={<DashboardIconInfo className="h-4 w-4" />}
        trailing={
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className={aosWorkspaceActionClassName}
          >
            Verknüpfen
          </button>
        }
      />

      {linkedInformation.length === 0 ? (
        <p className={aosWorkspaceMetaClassName}>Noch keine Informationen verknüpft.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {linkedInformation.map(({ information }) => (
            <li
              key={information.id}
              className="flex items-center gap-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]"
            >
              <p className={`min-w-0 flex-1 truncate px-1 text-[13px] font-medium ${aosWsTextPrimaryClassName}`}>
                {information.title}
              </p>
              <DetachInformationButton taskId={taskId} informationId={information.id} />
            </li>
          ))}
        </ul>
      )}

      <TaskLinkInformationDialog
        taskId={taskId}
        availableInformation={availableInformation}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  )
}
