'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { InformationAttachmentSection } from '@/features/information/components/information-attachment-section'
import { InformationDocumentBody } from '@/features/information/components/information-document-body'
import { InformationDocumentFooter } from '@/features/information/components/information-document-footer'
import { InformationDocumentHeader } from '@/features/information/components/information-document-header'
import { deleteInformationItemAction } from '@/features/information/actions/delete-information-item'
import { updateInformationItemAction } from '@/features/information/actions/update-information-item'
import type {
  InformationItem,
  InformationLinkedFile,
  InformationMutationState,
} from '@/features/information/types/information-item'
import { aosWorkspaceSurfaceClassName } from '@/lib/design-system'

type InformationDetailPanelProps = {
  item: InformationItem
  attachments?: InformationLinkedFile[]
  onBack?: () => void
  onDeleted: () => void
}

const initialState: InformationMutationState = {}

export function InformationDetailPanel({
  item,
  attachments = [],
  onBack,
  onDeleted,
}: InformationDetailPanelProps) {
  const updateFormId = useId()
  const deleteFormId = useId()
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateInformationItemAction,
    initialState,
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteInformationItemAction,
    initialState,
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
      <InformationDocumentHeader updatedAt={item.updated_at} onBack={onBack} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <form id={updateFormId} action={updateAction} className="flex flex-col">
          <input type="hidden" name="itemId" value={item.id} />
          <InformationDocumentBody
            itemId={item.id}
            title={item.title}
            content={item.content}
            updateState={updateState}
            disabled={isPending}
          />
        </form>

        <InformationAttachmentSection attachments={attachments} />
      </div>

      <form id={deleteFormId} action={deleteAction}>
        <input type="hidden" name="itemId" value={item.id} />
      </form>

      <InformationDocumentFooter
        updateFormId={updateFormId}
        deleteFormId={deleteFormId}
        confirmDelete={confirmDelete}
        onConfirmDelete={() => setConfirmDelete(true)}
        onCancelDelete={() => setConfirmDelete(false)}
        isPending={isPending}
        isUpdatePending={isUpdatePending}
        isDeletePending={isDeletePending}
        deleteState={deleteState}
      />
    </div>
  )
}
