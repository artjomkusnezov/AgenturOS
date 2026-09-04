'use client'

import { formatFileSize, formatMimeTypeLabel } from '@/features/files/lib/format-file-label'
import type { PendingUploadItem } from '@/features/files/types/file'

type FileUploadQueueItemProps = {
  item: PendingUploadItem
  isUploading: boolean
  onRemove: (clientId: string) => void
  onRetry: (clientId: string) => void
}

function getStatusLabel(item: PendingUploadItem): string {
  switch (item.status) {
    case 'queued':
      return 'Bereit zum Upload'
    case 'uploading':
      return 'Wird hochgeladen …'
    case 'success':
      return 'Hochgeladen'
    case 'error':
      return item.error ?? 'Upload fehlgeschlagen'
    default:
      return ''
  }
}

export function FileUploadQueueItem({
  item,
  isUploading,
  onRemove,
  onRetry,
}: FileUploadQueueItemProps) {
  const statusLabel = getStatusLabel(item)
  const canRemove = !isUploading && item.status !== 'uploading'
  const canRetry = !isUploading && item.status === 'error'

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {formatMimeTypeLabel(item.file.type || 'application/octet-stream')} ·{' '}
            {formatFileSize(item.file.size)}
          </p>
          <p
            className={`mt-1.5 text-xs ${
              item.status === 'error' ? 'text-red-400' : 'text-slate-400'
            }`}
            aria-live={item.status === 'error' ? 'polite' : 'off'}
          >
            {statusLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canRetry ? (
            <button
              type="button"
              onClick={() => onRetry(item.clientId)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Erneut
            </button>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              onClick={() => onRemove(item.clientId)}
              aria-label={`${item.file.name} aus Auswahl entfernen`}
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition-colors duration-150 hover:bg-white/10 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Entfernen
            </button>
          ) : null}
        </div>
      </div>
    </li>
  )
}
