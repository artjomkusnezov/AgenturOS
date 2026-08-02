'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import { deleteInformationItemAction } from '@/features/information/actions/delete-information-item'
import { updateInformationItemAction } from '@/features/information/actions/update-information-item'
import { formatInformationDateTime } from '@/features/information/lib/information-status'
import type { InformationItem, InformationMutationState } from '@/features/information/types/information-item'
import {
  aosBtnDangerClassName,
  aosDocBodyClassName,
  aosDocTitleClassName,
  aosFieldErrorSmClassName,
  aosPanelFooterClassName,
  aosPanelHeaderClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
  aosWorkspaceSurfaceClassName,
} from '@/lib/design-system'

type InformationDetailPanelProps = {
  item: InformationItem
  onBack?: () => void
  onDeleted: () => void
}

const initialState: InformationMutationState = {}

export function InformationDetailPanel({
  item,
  onBack,
  onDeleted,
}: InformationDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateInformationItemAction,
    initialState
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteInformationItemAction,
    initialState
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handledDeleteRef = useRef(false)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  const isPending = isUpdatePending || isDeletePending

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
        <p className={aosWorkspaceMetaClassName}>
          Geändert {formatInformationDateTime(item.updated_at)}
        </p>
      </div>

      <form
        id={updateFormId}
        action={updateAction}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <input type="hidden" name="itemId" value={item.id} />

        <section aria-label="Titel" className={`${aosWorkspaceSectionClassName} pb-2`}>
          <label htmlFor={`information-title-${item.id}`} className="sr-only">
            Titel
          </label>
          <input
            id={`information-title-${item.id}`}
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={item.title}
            disabled={isPending}
            className={aosDocTitleClassName}
          />
          {updateState.fieldErrors?.title ? (
            <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{updateState.fieldErrors.title}</p>
          ) : null}
        </section>

        <section aria-label="Inhalt" className={`${aosWorkspaceSectionClassName} flex flex-1 flex-col`}>
          <WorkspaceSectionHeading
            title="Inhalt"
            accent="violet"
            icon={<DashboardIconFileText className="h-4 w-4" />}
          />
          <label htmlFor={`information-content-${item.id}`} className="sr-only">
            Inhalt (optional)
          </label>
          <textarea
            id={`information-content-${item.id}`}
            name="content"
            rows={16}
            defaultValue={item.content ?? ''}
            disabled={isPending}
            placeholder="Details, Notizen, Links oder weiteres Wissen …"
            className={`${aosDocBodyClassName} min-h-[16rem]`}
          />

          {updateState.error ? (
            <p className={`mt-2 ${aosFieldErrorSmClassName}`}>{updateState.error}</p>
          ) : null}
          {updateState.success ? (
            <p className={`mt-2 ${aosWorkspaceMetaClassName}`}>Gespeichert.</p>
          ) : null}
        </section>
      </form>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="itemId" value={item.id} />
      </form>

      <div className={`${aosPanelFooterClassName} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={aosWorkspaceMetaClassName}>Wirklich löschen?</span>
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

        <button
          type="submit"
          form={updateFormId}
          disabled={isPending}
          className={aosWorkspaceActionEmphasisClassName}
        >
          {isUpdatePending ? '…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
