'use client'

import { useId, useRef } from 'react'

import {
  formatKfzLandingDocumentSize,
  KFZ_LANDING_CAMERA_ACCEPT,
  KFZ_LANDING_DOCUMENT_ACCEPT,
  KFZ_LANDING_DOCUMENT_GROUPS,
  KFZ_LANDING_STORAGE_NOTICE,
  type KfzLandingDocumentCandidate,
  type KfzLandingDocumentRejection,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import type { KfzUploadGroup } from '@/features/inbound/kfz/types/public-kfz-inquiry'

type KfzLandingDocumentFieldsProps = {
  documents: KfzLandingDocumentCandidate[]
  previews: Record<string, string>
  rejections: KfzLandingDocumentRejection[]
  disabled?: boolean
  onAddFiles: (group: KfzUploadGroup, files: FileList | null) => void
  onRemove: (id: string) => void
}

function filesForGroup(
  documents: KfzLandingDocumentCandidate[],
  group: KfzUploadGroup,
): KfzLandingDocumentCandidate[] {
  return documents.filter((doc) => doc.group === group)
}

export function KfzLandingDocumentFields({
  documents,
  previews,
  rejections,
  disabled = false,
  onAddFiles,
  onRemove,
}: KfzLandingDocumentFieldsProps) {
  const fieldId = useId()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">Unterlagen (optional)</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          Sie können die Anfrage ohne Upload absenden. Fahrzeugschein oder Beitragsrechnung
          helfen uns nur dabei, genauer zu prüfen.
        </p>
      </div>

      {KFZ_LANDING_DOCUMENT_GROUPS.map((group) => {
        const groupDocs = filesForGroup(documents, group.id)
        return (
          <fieldset
            key={group.id}
            className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 sm:p-4"
          >
            <legend className="px-0.5 text-sm font-semibold text-zinc-900">
              {group.label}
            </legend>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{group.hint}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DocumentPickButton
                id={`${fieldId}-${group.id}-camera`}
                label="Foto aufnehmen"
                hint="Kamera"
                accept={KFZ_LANDING_CAMERA_ACCEPT}
                capture="environment"
                disabled={disabled}
                onPick={(files) => onAddFiles(group.id, files)}
              />
              <DocumentPickButton
                id={`${fieldId}-${group.id}-files`}
                label="Foto oder Datei wählen"
                hint="Galerie / Dateien"
                accept={KFZ_LANDING_DOCUMENT_ACCEPT}
                disabled={disabled}
                onPick={(files) => onAddFiles(group.id, files)}
              />
            </div>

            {groupDocs.length > 0 ? (
              <ul className="mt-3 space-y-2" aria-label={`Ausgewählt: ${group.label}`}>
                {groupDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                  >
                    {previews[doc.id] ? (
                      <span
                        aria-hidden="true"
                        className="h-12 w-12 shrink-0 rounded-lg bg-zinc-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${previews[doc.id]})` }}
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        PDF
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {doc.mimeType || 'Datei'} · {formatKfzLandingDocumentSize(doc.sizeBytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      disabled={disabled}
                      onClick={() => onRemove(doc.id)}
                    >
                      Entfernen
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">Noch keine Datei ausgewählt.</p>
            )}
          </fieldset>
        )
      })}

      {rejections.length > 0 ? (
        <ul className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
          {rejections.map((item) => (
            <li key={`${item.filename}-${item.code}`}>
              {item.filename}: {item.reason}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-500">{KFZ_LANDING_STORAGE_NOTICE}</p>
    </div>
  )
}

function DocumentPickButton({
  id,
  label,
  hint,
  accept,
  capture,
  disabled,
  onPick,
}: {
  id: string
  label: string
  hint: string
  accept: string
  capture?: 'environment'
  disabled?: boolean
  onPick: (files: FileList | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files)
          event.target.value = ''
        }}
      />
      <label
        htmlFor={id}
        className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-center shadow-sm ${
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-600 hover:bg-blue-50/50'
        }`}
      >
        <span className="text-sm font-semibold text-zinc-900">{label}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </label>
    </div>
  )
}
