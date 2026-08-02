'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  useActionState,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

import { updateCaseWorkflowAction } from '@/features/cases/actions/update-case-workflow-action'
import {
  CASE_CORE_STATUS_LABELS,
  formatCasePriorityLabel,
} from '@/features/cases/lib/case-display'
import { CASE_CORE_STATUSES } from '@/features/cases/types/case'
import type { CaseRecord } from '@/features/cases/types/case'
import type { CaseWorkflowMutationState } from '@/features/cases/types/case-workflow'
import type { AgencyMember } from '@/features/agency/types/agency-member'
import { TASK_PRIORITIES } from '@/features/tasks/lib/task-priority'
import {
  aosFieldErrorClassName,
  aosInputClassName,
  aosSelectClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type CaseWorkflowControlsProps = {
  caseRow: CaseRecord
  caseTypeKey: string | null
  members: AgencyMember[]
}

const initialState: CaseWorkflowMutationState = {}

function disableInteractiveChildren(node: ReactNode, disabled: boolean): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) {
      return child
    }

    const element = child as ReactElement<{
      disabled?: boolean
      children?: ReactNode
    }>

    if (
      element.type === 'select' ||
      element.type === 'input' ||
      element.type === 'button'
    ) {
      return cloneElement(element, {
        disabled: disabled || Boolean(element.props.disabled),
        children: disableInteractiveChildren(element.props.children, disabled),
      })
    }

    if (element.props.children) {
      return cloneElement(element, {
        children: disableInteractiveChildren(element.props.children, disabled),
      })
    }

    return element
  })
}

function WorkflowFieldForm({
  caseId,
  field,
  children,
  onSuccessKey,
  autoSubmitOnChange = true,
}: {
  caseId: string
  field: 'coreStatus' | 'assignee' | 'priority' | 'dueAt'
  children: ReactNode
  onSuccessKey: string
  autoSubmitOnChange?: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(
    updateCaseWorkflowAction,
    initialState,
  )
  const handledRef = useRef(false)

  useEffect(() => {
    handledRef.current = false
  }, [onSuccessKey])

  useEffect(() => {
    if (state.success && !handledRef.current) {
      handledRef.current = true
      router.refresh()
    }
  }, [state.success, router])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex min-w-0 flex-col gap-1"
      onChange={() => {
        if (autoSubmitOnChange) {
          formRef.current?.requestSubmit()
        }
      }}
    >
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="field" value={field} />
      {disableInteractiveChildren(children, isPending)}
      {isPending ? (
        <span className={aosWorkspaceMetaClassName}>Wird gespeichert …</span>
      ) : null}
      {state.fieldErrors?.coreStatus ||
      state.fieldErrors?.assigneeUserId ||
      state.fieldErrors?.priority ||
      state.fieldErrors?.dueAt ||
      state.error ? (
        <p className={aosFieldErrorClassName} role="alert">
          {state.fieldErrors?.coreStatus ??
            state.fieldErrors?.assigneeUserId ??
            state.fieldErrors?.priority ??
            state.fieldErrors?.dueAt ??
            state.error}
        </p>
      ) : null}
    </form>
  )
}

export function CaseWorkflowControls({
  caseRow,
  caseTypeKey,
  members,
}: CaseWorkflowControlsProps) {
  const requireDue = caseTypeKey === 'follow_up'
  const dueValue = caseRow.due_at ?? ''

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <label
          htmlFor={`case-status-${caseRow.id}`}
          className={`mb-1 block ${aosWorkspaceMetaClassName}`}
        >
          Status
        </label>
        <WorkflowFieldForm
          caseId={caseRow.id}
          field="coreStatus"
          onSuccessKey={`${caseRow.id}-status-${caseRow.core_status}`}
        >
          <select
            id={`case-status-${caseRow.id}`}
            name="coreStatus"
            key={`status-${caseRow.core_status}`}
            defaultValue={caseRow.core_status}
            className={`${aosSelectClassName} w-full`}
          >
            {CASE_CORE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CASE_CORE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </WorkflowFieldForm>
      </div>

      <div className="min-w-0">
        <label
          htmlFor={`case-assignee-${caseRow.id}`}
          className={`mb-1 block ${aosWorkspaceMetaClassName}`}
        >
          Verantwortlich
        </label>
        <WorkflowFieldForm
          caseId={caseRow.id}
          field="assignee"
          onSuccessKey={`${caseRow.id}-assignee-${caseRow.assignee_user_id ?? 'none'}`}
        >
          <select
            id={`case-assignee-${caseRow.id}`}
            name="assigneeUserId"
            key={`assignee-${caseRow.assignee_user_id ?? 'none'}`}
            defaultValue={caseRow.assignee_user_id ?? ''}
            className={`${aosSelectClassName} w-full`}
          >
            <option value="">Nicht zugewiesen</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </WorkflowFieldForm>
      </div>

      <div className="min-w-0">
        <label
          htmlFor={`case-priority-${caseRow.id}`}
          className={`mb-1 block ${aosWorkspaceMetaClassName}`}
        >
          Priorität
        </label>
        <WorkflowFieldForm
          caseId={caseRow.id}
          field="priority"
          onSuccessKey={`${caseRow.id}-priority-${caseRow.priority}`}
        >
          <select
            id={`case-priority-${caseRow.id}`}
            name="priority"
            key={`priority-${caseRow.priority}`}
            defaultValue={caseRow.priority}
            className={`${aosSelectClassName} w-full`}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatCasePriorityLabel(priority)}
              </option>
            ))}
          </select>
        </WorkflowFieldForm>
      </div>

      <div className="min-w-0">
        <label
          htmlFor={`case-due-${caseRow.id}`}
          className={`mb-1 block ${aosWorkspaceMetaClassName}`}
        >
          Fälligkeit{requireDue ? ' (erforderlich)' : ''}
        </label>
        <WorkflowFieldForm
          caseId={caseRow.id}
          field="dueAt"
          onSuccessKey={`${caseRow.id}-due-${caseRow.due_at ?? 'none'}`}
          autoSubmitOnChange={false}
        >
          <div className="flex items-center gap-2">
            <input
              id={`case-due-${caseRow.id}`}
              name="dueAt"
              type="date"
              key={`due-${dueValue || 'none'}`}
              defaultValue={dueValue}
              required={requireDue}
              className={`${aosInputClassName} w-full`}
              onBlur={(event) => {
                event.currentTarget.form?.requestSubmit()
              }}
            />
            {!requireDue && dueValue ? (
              <button
                type="button"
                className="shrink-0 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-700"
                onClick={(event) => {
                  const form = event.currentTarget.form
                  const input = form?.elements.namedItem('dueAt')
                  if (input instanceof HTMLInputElement) {
                    input.value = ''
                  }
                  form?.requestSubmit()
                }}
              >
                Entfernen
              </button>
            ) : null}
          </div>
        </WorkflowFieldForm>
      </div>
    </div>
  )
}
