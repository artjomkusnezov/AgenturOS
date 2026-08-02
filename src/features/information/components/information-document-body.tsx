'use client'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFileText } from '@/features/dashboard/components/dashboard-icons'
import type { InformationMutationState } from '@/features/information/types/information-item'
import {
  aosDocBodyClassName,
  aosDocTitleClassName,
  aosFieldErrorSmClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type InformationDocumentBodyProps = {
  itemId: string
  title: string
  content: string | null
  updateState: InformationMutationState
  disabled?: boolean
}

export function InformationDocumentBody({
  itemId,
  title,
  content,
  updateState,
  disabled = false,
}: InformationDocumentBodyProps) {
  return (
    <>
      <section aria-label="Titel" className={`${aosWorkspaceSectionClassName} pb-2`}>
        <label htmlFor={`information-title-${itemId}`} className="sr-only">
          Titel
        </label>
        <input
          id={`information-title-${itemId}`}
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={title}
          disabled={disabled}
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
        <label htmlFor={`information-content-${itemId}`} className="sr-only">
          Inhalt (optional)
        </label>
        <textarea
          id={`information-content-${itemId}`}
          name="content"
          rows={16}
          defaultValue={content ?? ''}
          disabled={disabled}
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
    </>
  )
}
