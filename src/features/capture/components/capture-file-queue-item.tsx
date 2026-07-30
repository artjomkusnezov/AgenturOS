'use client'

import { formatFileSize, formatMimeTypeLabel } from '@/features/files/lib/format-file-label'
import type { CaptureQueueItem } from '@/features/capture/types/capture'

type CaptureFileQueueItemProps = {
  item: CaptureQueueItem
  disabled: boolean
  onRemove: (clientId: string) => void
}

export function CaptureFileQueueItem({ item, disabled, onRemove }: CaptureFileQueueItemProps) {
  return (
    <li className="rounded-xl border border-zinc-200/70 bg-white px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {formatMimeTypeLabel(item.file.type || 'application/octet-stream')} ·{' '}
            {formatFileSize(item.file.size)}
          </p>
          {item.error ? (
            <p className="mt-1.5 text-xs text-red-600" aria-live="polite">
              {item.error}
            </p>
          ) : null}
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={() => onRemove(item.clientId)}
            aria-label={`${item.file.name} entfernen`}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Entfernen
          </button>
        ) : null}
      </div>
    </li>
  )
}
