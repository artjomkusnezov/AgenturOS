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
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
      >
        {isPending ? '…' : 'Entfernen'}
      </button>
      {state.error ? (
        <p className="mt-1 max-w-24 text-[10px] leading-tight text-red-600" role="alert">
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
      className="flex flex-col gap-3 border-t border-zinc-200/70 pt-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">Informationen</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Verknüpfte Informationen aus dem Informationsbereich.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="shrink-0 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50"
        >
          Information verknüpfen
        </button>
      </div>

      {linkedInformation.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200/80 bg-zinc-50/50 px-4 py-4 text-sm text-zinc-500">
          Noch keine Informationen verknüpft.
        </p>
      ) : (
        <ul className="space-y-2">
          {linkedInformation.map(({ information }) => (
            <li
              key={information.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200/70 bg-white px-3 py-2.5"
            >
              <p className="min-w-0 truncate text-sm font-medium text-zinc-900">
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
