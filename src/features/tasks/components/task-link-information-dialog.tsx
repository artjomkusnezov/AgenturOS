'use client'

import { useEffect, useId, useRef } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'

import { CloseIcon } from '@/components/app/app-icons'
import { attachTaskInformationAction } from '@/features/tasks/actions/attach-task-information-action'
import type { InformationItem } from '@/features/information/types/information-item'
import type { TaskRelationMutationState } from '@/features/tasks/types/task-relation'

type TaskLinkInformationDialogProps = {
  taskId: string
  availableInformation: InformationItem[]
  isOpen: boolean
  onClose: () => void
}

const initialState: TaskRelationMutationState = {}

export function TaskLinkInformationDialog({
  taskId,
  availableInformation,
  isOpen,
  onClose,
}: TaskLinkInformationDialogProps) {
  const router = useRouter()
  const titleId = useId()
  const [state, formAction, isPending] = useActionState(
    attachTaskInformationAction,
    initialState,
  )
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [isOpen])

  useEffect(() => {
    if (state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true
      router.refresh()
      onClose()
    }
  }, [state.success, onClose, router])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dialog schließen"
        className="absolute inset-0 bg-zinc-900/40"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(32rem,85vh)] w-full max-w-lg flex-col rounded-xl border border-zinc-200/80 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200/70 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-zinc-900">
              Information verknüpfen
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Wählen Sie eine vorhandene Information aus Ihrem Informationsbereich.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {availableInformation.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200/80 bg-zinc-50/50 px-4 py-6 text-sm text-zinc-500">
              Keine weiteren Informationen verfügbar.
            </p>
          ) : (
            <ul className="space-y-2">
              {availableInformation.map((item) => (
                <li key={item.id}>
                  <form action={formAction}>
                    <input type="hidden" name="taskId" value={taskId} />
                    <input type="hidden" name="informationId" value={item.id} />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full rounded-lg border border-zinc-200/70 px-3 py-2.5 text-left transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      <p className="truncate text-sm font-medium text-zinc-900">{item.title}</p>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {state.error ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
