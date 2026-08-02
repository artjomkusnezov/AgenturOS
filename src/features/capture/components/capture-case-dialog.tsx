'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { createCaseAction } from '@/features/cases/actions/create-case-action'
import type { CreateCaseMutationState } from '@/features/cases/actions/create-case-action'
import { buildCasesItemHref } from '@/features/cases/lib/cases-workspace-urls'
import type { DirectCaseTypeKey } from '@/features/cases/lib/validate-create-case'
import { CaptureDialogShell } from '@/features/capture/components/capture-dialog-shell'
import { CAPTURE_CASE_DIALOG_COPY } from '@/features/capture/lib/capture-case-copy'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@/features/tasks/lib/task-priority'
import {
  aosBtnGhostLgClassName,
  aosBtnPrimaryLgClassName,
  aosFieldErrorSmClassName,
  aosInputLgClassName,
  aosSelectClassName,
  aosTextareaClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

type CaptureCaseDialogProps = {
  caseTypeKey: DirectCaseTypeKey
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  members: AgencyMember[]
  defaultAssigneeUserId: string
}

const initialState: CreateCaseMutationState = {}

export function CaptureCaseDialog({
  caseTypeKey,
  isOpen,
  onClose,
  triggerRef,
  members,
  defaultAssigneeUserId,
}: CaptureCaseDialogProps) {
  const router = useRouter()
  const processingRef = useRef(false)
  const copy = CAPTURE_CASE_DIALOG_COPY[caseTypeKey]
  const dueRequired = caseTypeKey === 'follow_up'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState(defaultAssigneeUserId)
  const [priority, setPriority] = useState('normal')
  const [dueAt, setDueAt] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dueAtError, setDueAtError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setAssigneeUserId(defaultAssigneeUserId)
    setPriority('normal')
    setDueAt('')
    setTitleError(null)
    setDueAtError(null)
    setGlobalError(null)
  }, [defaultAssigneeUserId])

  const handleClose = useCallback(() => {
    if (isProcessing) {
      return
    }

    resetForm()
    onClose()
  }, [isProcessing, onClose, resetForm])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (processingRef.current || isProcessing) {
        return
      }

      setTitleError(null)
      setDueAtError(null)
      setGlobalError(null)
      processingRef.current = true
      setIsProcessing(true)

      try {
        const formData = new FormData()
        formData.set('caseTypeKey', caseTypeKey)
        formData.set('title', title)
        formData.set('description', description)
        formData.set('assigneeUserId', assigneeUserId)
        formData.set('priority', priority)
        formData.set('dueAt', dueAt)

        const result = await createCaseAction(initialState, formData)

        if (result.fieldErrors?.title) {
          setTitleError(result.fieldErrors.title)
          return
        }

        if (result.fieldErrors?.dueAt) {
          setDueAtError(result.fieldErrors.dueAt)
          return
        }

        if (!result.success || !result.caseId) {
          setGlobalError(result.error ?? 'Der Vorgang konnte nicht erstellt werden.')
          return
        }

        const viewKey = result.viewKey ?? 'cases'
        router.refresh()
        resetForm()
        onClose()
        router.push(
          buildCasesItemHref('cases', viewKey, { caseId: result.caseId }),
        )
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [
      assigneeUserId,
      caseTypeKey,
      description,
      dueAt,
      isProcessing,
      onClose,
      priority,
      resetForm,
      router,
      title,
    ],
  )

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={handleClose}
        disabled={isProcessing}
        className={aosBtnGhostLgClassName}
      >
        Abbrechen
      </button>
      <button
        type="submit"
        form={`capture-case-form-${caseTypeKey}`}
        disabled={isProcessing || !title.trim() || (dueRequired && !dueAt)}
        className={aosBtnPrimaryLgClassName}
      >
        {isProcessing ? 'Wird erstellt …' : copy.submitLabel}
      </button>
    </div>
  )

  return (
    <CaptureDialogShell
      isOpen={isOpen}
      title={copy.title}
      description={copy.description}
      onClose={handleClose}
      closeDisabled={isProcessing}
      triggerRef={triggerRef}
      footer={footer}
    >
      <form
        id={`capture-case-form-${caseTypeKey}`}
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`capture-case-title-${caseTypeKey}`} className={aosTextLabelClassName}>
              Titel
            </label>
            <input
              id={`capture-case-title-${caseTypeKey}`}
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isProcessing}
              autoFocus
              placeholder="Kurzer Titel"
              className={aosInputLgClassName}
            />
            {titleError ? <p className={aosFieldErrorSmClassName}>{titleError}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`capture-case-description-${caseTypeKey}`}
              className={aosTextLabelClassName}
            >
              Beschreibung
              <span className="font-normal text-zinc-500"> (optional)</span>
            </label>
            <textarea
              id={`capture-case-description-${caseTypeKey}`}
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isProcessing}
              placeholder="Weitere Details …"
              className={`${aosTextareaClassName} min-h-[5rem]`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`capture-case-assignee-${caseTypeKey}`}
                className={aosTextLabelClassName}
              >
                Verantwortlicher
              </label>
              <select
                id={`capture-case-assignee-${caseTypeKey}`}
                name="assigneeUserId"
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                disabled={isProcessing}
                className={aosSelectClassName}
              >
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`capture-case-priority-${caseTypeKey}`}
                className={aosTextLabelClassName}
              >
                Priorität
              </label>
              <select
                id={`capture-case-priority-${caseTypeKey}`}
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                disabled={isProcessing}
                className={aosSelectClassName}
              >
                {TASK_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`capture-case-due-${caseTypeKey}`} className={aosTextLabelClassName}>
              Fälligkeit
              {!dueRequired ? (
                <span className="font-normal text-zinc-500"> (optional)</span>
              ) : null}
            </label>
            <input
              id={`capture-case-due-${caseTypeKey}`}
              name="dueAt"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              disabled={isProcessing}
              required={dueRequired}
              className={aosInputLgClassName}
            />
            {dueAtError ? <p className={aosFieldErrorSmClassName}>{dueAtError}</p> : null}
          </div>

          {globalError ? <p className={aosFieldErrorSmClassName}>{globalError}</p> : null}
        </div>
      </form>
    </CaptureDialogShell>
  )
}
