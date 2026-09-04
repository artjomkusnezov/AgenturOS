'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'

import { deleteFileAction } from '@/features/files/actions/delete-file'
import { downloadFileAction } from '@/features/files/actions/download-file'
import { formatFileSize, formatMimeTypeLabel } from '@/features/files/lib/format-file-label'
import { formatFileDateTime } from '@/features/files/lib/file-status'
import type { FileMutationState, FileRecord } from '@/features/files/types/file'
import {
  aosBtnDangerClassName,
  aosBtnGhostClassName,
  aosBtnPrimaryClassName,
  aosBtnSecondaryClassName,
  aosFieldErrorSmClassName,
  aosWorkspaceSurfaceClassName,
  aosWsTextMetaClassName,
  aosWsTextPrimaryClassName,
  aosWsTextSecondaryClassName,
} from '@/lib/design-system'

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
      className={`${aosWorkspaceSurfaceClassName} flex h-full min-h-0 flex-col`}
      aria-labelledby={`file-detail-title-${file.id}`}
    >
      <div className="border-b border-zinc-200/40 px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`mb-2 inline-flex items-center text-sm font-medium ${aosWsTextMetaClassName} transition-colors duration-150 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden`}
          >
            ← Zurück zur Liste
          </button>
        ) : null}
        <h2
          id={`file-detail-title-${file.id}`}
          className={`text-sm font-semibold tracking-tight ${aosWsTextPrimaryClassName}`}
        >
          Dateidetails
        </h2>
        <p className={`mt-1 truncate text-sm ${aosWsTextSecondaryClassName}`} title={file.filename}>
          {file.filename}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className={`text-[10px] font-medium uppercase tracking-wider ${aosWsTextMetaClassName}`}>
              Typ
            </dt>
            <dd className={`mt-1 text-sm ${aosWsTextPrimaryClassName}`}>
              {formatMimeTypeLabel(file.mime_type)}
            </dd>
          </div>
          <div>
            <dt className={`text-[10px] font-medium uppercase tracking-wider ${aosWsTextMetaClassName}`}>
              Größe
            </dt>
            <dd className={`mt-1 text-sm ${aosWsTextPrimaryClassName}`}>
              {formatFileSize(file.size_bytes)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={`text-[10px] font-medium uppercase tracking-wider ${aosWsTextMetaClassName}`}>
              Erstellt am
            </dt>
            <dd className={`mt-1 text-sm ${aosWsTextPrimaryClassName}`}>
              {formatFileDateTime(file.created_at)}
            </dd>
          </div>
        </dl>

        <div id={statusRegionId} role="status" aria-live="polite" className="space-y-2">
          {downloadState.error ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className={aosFieldErrorSmClassName}>{downloadState.error}</p>
              <button
                type="submit"
                form={downloadFormId}
                disabled={isPending}
                className={aosBtnGhostClassName}
              >
                Download erneut versuchen
              </button>
            </div>
          ) : null}
          {deleteState.error ? (
            <p className={aosFieldErrorSmClassName}>{deleteState.error}</p>
          ) : null}
        </div>
      </div>

      <form id={downloadFormId} action={downloadAction} aria-label="Datei herunterladen">
        <input type="hidden" name="fileId" value={file.id} />
      </form>

      <form id={deleteFormId} action={deleteAction} aria-label="Datei löschen">
        <input type="hidden" name="fileId" value={file.id} />
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/40 px-4 py-3">
        <div>
          {confirmDelete ? (
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Löschen bestätigen"
            >
              <span className={`text-sm ${aosWsTextSecondaryClassName}`}>
                {file.filename} wirklich endgültig löschen?
              </span>
              <button
                type="submit"
                form={deleteFormId}
                disabled={isPending}
                className={aosBtnDangerClassName}
              >
                {isDeletePending ? 'Wird gelöscht …' : 'Endgültig löschen'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className={aosBtnSecondaryClassName}
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
              className={aosBtnDangerClassName}
            >
              Datei löschen
            </button>
          )}
        </div>

        <button
          type="submit"
          form={downloadFormId}
          disabled={isPending}
          className={aosBtnPrimaryClassName}
        >
          {isDownloadPending ? 'Download wird vorbereitet …' : 'Herunterladen'}
        </button>
      </div>
    </article>
  )
}
