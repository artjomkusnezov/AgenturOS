'use client'

import { formatInformationDateTime } from '@/features/information/lib/information-status'
import {
  aosPanelHeaderClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type InformationDocumentHeaderProps = {
  updatedAt: string
  creatorName?: string | null
  onBack?: () => void
}

export function InformationDocumentHeader({
  updatedAt,
  creatorName,
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
        {creatorName ? (
          <>
            <span>Erfasst von {creatorName}</span>
            <span className="mx-1.5 text-zinc-300">·</span>
          </>
        ) : null}
        <span>Geändert {formatInformationDateTime(updatedAt)}</span>
      </p>
    </div>
  )
}
