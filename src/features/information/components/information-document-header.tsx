'use client'

import { formatInformationDateTime } from '@/features/information/lib/information-status'
import {
  aosPanelHeaderClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type InformationDocumentHeaderProps = {
  updatedAt: string
  onBack?: () => void
}

export function InformationDocumentHeader({
  updatedAt,
  onBack,
}: InformationDocumentHeaderProps) {
  return (
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
        Geändert {formatInformationDateTime(updatedAt)}
      </p>
    </div>
  )
}
