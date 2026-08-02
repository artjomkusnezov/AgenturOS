'use client'

import type { InformationMutationState } from '@/features/information/types/information-item'
import {
  aosBtnDangerClassName,
  aosPanelFooterClassName,
  aosWorkspaceActionClassName,
  aosWorkspaceActionEmphasisClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type InformationDocumentFooterProps = {
  updateFormId: string
  deleteFormId: string
  confirmDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  isPending: boolean
  isUpdatePending: boolean
  isDeletePending: boolean
  deleteState: InformationMutationState
}

export function InformationDocumentFooter({
  updateFormId,
  deleteFormId,
  confirmDelete,
  onConfirmDelete,
  onCancelDelete,
  isPending,
  isUpdatePending,
  isDeletePending,
  deleteState,
}: InformationDocumentFooterProps) {
  return (
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
              onClick={onCancelDelete}
              disabled={isPending}
              className={aosWorkspaceActionClassName}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConfirmDelete}
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
  )
}
