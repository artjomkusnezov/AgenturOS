'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteFileAction } from '@/features/files/actions/delete-file'
import { downloadFileAction } from '@/features/files/actions/download-file'
import { formatFileSize, formatMimeTypeLabel } from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileMutationState, FileRecord } from '@/features/files/types/file'

type FileDetailPanelProps = {
  file: FileRecord
  onBack?: () => void
  onDeleted: () => void
}

const initialState: FileMutationState = {}

export function FileDetailPanel({ file, onBack, onDeleted }: FileDetailPanelProps) {
  const downloadFormId = useId()
  const deleteFormId = useId()
  const statusRegionId = useId()
  const [downloadState, downloadAction, isDownloadPending] = useActionState(
    downloadFileAction,
    initialState
  )
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteFileAction,
    initialState
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handledDeleteRef = useRef(false)
  const handledDownloadRef = useRef<string | null>(null)

  useEffect(() => {
    if (deleteState.success && !handledDeleteRef.current) {
      handledDeleteRef.current = true
      onDeleted()
    }
  }, [deleteState.success, onDeleted])

  useEffect(() => {
    if (
      downloadState.success &&
      downloadState.downloadUrl &&
      handledDownloadRef.current !== downloadState.downloadUrl
    ) {
      handledDownloadRef.current = downloadState.downloadUrl
      window.location.assign(downloadState.downloadUrl)
    }
  }, [downloadState.success, downloadState.downloadUrl])

  const isPending = isDownloadPending || isDeletePending

  return (
    <article
      className="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white"
      aria-labelledby={`file-detail-title-${file.id}`}
    >
      <div className="border-b border-zinc-200/70 px-5 py-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center text-sm font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            ← Zurück zur Liste
          </button>
        ) : null}
        <h2
          id={`file-detail-title-${file.id}`}
          className="text-sm font-semibold tracking-tight text-zinc-900"
        >
          Dateidetails
        </h2>
        <p className="mt-1 truncate text-sm text-zinc-700" title={file.filename}>
          {file.filename}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-400">Typ</dt>
            <dd className="mt-1 text-sm text-zinc-900">{formatMimeTypeLabel(file.mime_type)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-400">Größe</dt>
            <dd className="mt-1 text-sm text-zinc-900">{formatFileSize(file.size_bytes)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Erstellt am
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {formatFileDateTime(file.created_at)}
            </dd>
          </div>
        </dl>

        <div id={statusRegionId} role="status" aria-live="polite" className="space-y-2">
          {downloadState.error ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-red-600">{downloadState.error}</p>
              <button
                type="submit"
                form={downloadFormId}
                disabled={isPending}
                className="rounded-lg px-2 py-1 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              >
                Download erneut versuchen
              </button>
            </div>
          ) : null}
          {deleteState.error ? (
            <p className="text-sm text-red-600">{deleteState.error}</p>
          ) : null}
        </div>
      </div>

      <form id={downloadFormId} action={downloadAction} aria-label="Datei herunterladen">
        <input type="hidden" name="fileId" value={file.id} />
      </form>

      <form id={deleteFormId} action={deleteAction} aria-label="Datei löschen">
        <input type="hidden" name="fileId" value={file.id} />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/70 px-5 py-4">
        <div>
          {confirmDelete ? (
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Löschen bestätigen"
            >
              <span className="text-sm text-zinc-600">
                {file.filename} wirklich endgültig löschen?
              </span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60"
              >
                {isDeletePending ? 'Wird gelöscht …' : 'Endgültig löschen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              aria-describedby={statusRegionId}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60"
            >
              Datei löschen
            </button>
          )}
        </div>

        <button
          type="submit"
          form={downloadFormId}
          disabled={isPending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {isDownloadPending ? 'Download wird vorbereitet …' : 'Herunterladen'}
        </button>
      </div>
    </article>
  )
}
