'use client'

import { useState } from 'react'

import { KFZ_COPY_NO_STATUS_CHANGE } from '@/features/inbox/lib/kfz-reply-handoff'
import {
  aosWorkspaceActionAccentClassName,
  aosWorkspaceMetaClassName,
} from '@/lib/design-system'

type InboxKfzCopyButtonProps = {
  value: string | null
  label: string
  emptyLabel: string
}

export function InboxKfzCopyButton({
  value,
  label,
  emptyLabel,
}: InboxKfzCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  if (!value) {
    return <p className={aosWorkspaceMetaClassName}>{emptyLabel}</p>
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
          } catch {
            const area = document.createElement('textarea')
            area.value = value
            area.setAttribute('readonly', '')
            area.style.position = 'fixed'
            area.style.left = '-9999px'
            document.body.appendChild(area)
            area.select()
            document.execCommand('copy')
            document.body.removeChild(area)
          }
          setCopied(true)
        }}
        className={aosWorkspaceActionAccentClassName}
      >
        {copied ? 'Kopiert' : label}
      </button>
      {copied ? (
        <p className={aosWorkspaceMetaClassName}>{KFZ_COPY_NO_STATUS_CHANGE}</p>
      ) : null}
    </div>
  )
}
