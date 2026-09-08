'use client'

import { useRef, useState } from 'react'

import { InboxWorkspace } from '@/features/inbox/components/inbox-workspace'
import { ManualQuickCaptureDialog } from '@/features/inbound/manual/components/manual-quick-capture-dialog'
import {
  MANUAL_CAPTURE_ACTION_LABEL,
  MANUAL_CAPTURE_NO_AUTO_ACTION,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import { MANUAL_CAPTURE_PREVIEW_PATH } from '@/features/inbound/manual/lib/manual-capture-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import { aosBtnPrimaryLgClassName } from '@/lib/design-system'

/**
 * Local-only interactive capture → draft review → inbox workspace.
 * Production returns 404 from the page. Nothing is sent.
 */
export function ManualCapturePreviewApp() {
  const [isOpen, setIsOpen] = useState(true)
  const [item, setItem] = useState<InboxItem | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <main className="aos-cockpit-shell min-h-screen p-3 sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-zinc-400">
        Lokale Vorschau · manuelle Texterfassung · {MANUAL_CAPTURE_NO_AUTO_ACTION}
      </p>

      {!item ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <h1 className="text-base font-semibold text-zinc-900">{MANUAL_CAPTURE_ACTION_LABEL}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Quelle wählen, Text einfügen, Entwurf prüfen, erst dann im Eingang anlegen.
          </p>
          <button
            type="button"
            className={`${aosBtnPrimaryLgClassName} mt-4 min-h-11`}
            onClick={() => setIsOpen(true)}
          >
            {MANUAL_CAPTURE_ACTION_LABEL}
          </button>
        </div>
      ) : (
        <div className="mx-auto min-h-[80vh] max-w-6xl">
          <InboxWorkspace
            unprocessedItems={[item]}
            processedItems={[]}
            taskRelationsByItemId={{}}
            selectedItemId={item.id}
            hrefBasePath={MANUAL_CAPTURE_PREVIEW_PATH}
          />
        </div>
      )}

      <ManualQuickCaptureDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        onLocalConfirmed={(created) => {
          setItem(created)
          setIsOpen(false)
        }}
        reviewHrefBase={MANUAL_CAPTURE_PREVIEW_PATH}
      />
    </main>
  )
}
