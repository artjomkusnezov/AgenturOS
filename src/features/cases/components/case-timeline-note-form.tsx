'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { createCaseTimelineNoteAction } from '@/features/cases/actions/create-case-timeline-note-action'
import type { CaseTimelineNoteMutationState } from '@/features/cases/actions/create-case-timeline-note-action'
import {
  aosDocBodyClassName,
  aosFieldErrorClassName,
  aosWorkspaceActionEmphasisClassName,
} from '@/lib/design-system'

type CaseTimelineNoteFormProps = {
  caseId: string
}

const initialState: CaseTimelineNoteMutationState = {}

export function CaseTimelineNoteForm({ caseId }: CaseTimelineNoteFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    createCaseTimelineNoteAction,
    initialState,
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const handledSuccessRef = useRef(false)

  useEffect(() => {
    handledSuccessRef.current = false
  }, [caseId])

  useEffect(() => {
    if (state.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true

      if (textareaRef.current) {
        textareaRef.current.value = ''
      }

      router.refresh()
    }
  }, [state.success, router])

  return (
    <form action={formAction}>
      <input type="hidden" name="caseId" value={caseId} />

      <div className="flex flex-col gap-2">
        <label htmlFor={`case-timeline-note-${caseId}`} className="sr-only">
          Notiz hinzufügen
        </label>
        <textarea
          ref={textareaRef}
          id={`case-timeline-note-${caseId}`}
          name="content"
          rows={3}
          disabled={isPending}
          placeholder="Notiz hinzufügen..."
          className={`${aosDocBodyClassName} min-h-[4.5rem] rounded-md border border-zinc-200/60 bg-zinc-50/40 px-3 py-2.5`}
        />
        {state.fieldErrors?.content ? (
          <p className={aosFieldErrorClassName}>{state.fieldErrors.content}</p>
        ) : null}
        {state.error ? <p className={aosFieldErrorClassName}>{state.error}</p> : null}
      </div>

      <div className="mt-2.5 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={aosWorkspaceActionEmphasisClassName}
        >
          {isPending ? '…' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  )
}
