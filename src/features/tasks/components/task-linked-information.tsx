'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { detachTaskInformationAction } from '@/features/tasks/actions/detach-task-information-action'
import { TaskLinkInformationDialog } from '@/features/tasks/components/task-link-information-dialog'
import type { InformationItem } from '@/features/information/types/information-item'
import type {
  TaskLinkedInformation,
  TaskRelationMutationState,
} from '@/features/tasks/types/task-relation'
import { aosBtnXsClassName, aosListContainerClassName } from '@/lib/design-system'

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
        className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-60"
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
    <section
      aria-label="Informationen"
      className="flex flex-col gap-2 border-t border-zinc-200/70 pt-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Informationen
          {linkedInformation.length > 0 ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-400">
              ({linkedInformation.length})
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className={aosBtnXsClassName}
        >
          Verknüpfen
        </button>
      </div>

      {linkedInformation.length === 0 ? (
        <p className="text-xs text-zinc-400">Noch keine Informationen verknüpft.</p>
      ) : (
        <ul className={aosListContainerClassName}>
          {linkedInformation.map(({ information }) => (
            <li
              key={information.id}
              className="flex items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-zinc-50/80"
            >
              <p className="min-w-0 flex-1 truncate text-sm text-zinc-900">{information.title}</p>
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
