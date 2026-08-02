'use client'

import type { ReactNode, SVGProps } from 'react'
import { useActionState, useEffect, useRef } from 'react'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import {
  DashboardIconFile,
  DashboardIconFileText,
  DashboardIconImage,
  DashboardIconMic,
} from '@/features/dashboard/components/dashboard-icons'
import { downloadFileAction } from '@/features/files/actions/download-file'
import { classifyMediaKind, type MediaKind } from '@/features/files/lib/classify-media-kind'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { FileMutationState } from '@/features/files/types/file'
import type { InformationLinkedFile } from '@/features/information/types/information-item'
import {
  aosWorkspaceActionClassName,
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type InformationAttachmentSectionProps = {
  attachments: InformationLinkedFile[]
}

const initialDownloadState: FileMutationState = {}

type IconProps = SVGProps<SVGSVGElement>

function DashboardIconVideo(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg
      className={className ?? 'h-[1.125rem] w-[1.125rem]'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x="4" y="7" width="12" height="10" rx="2" />
      <path d="m16 10 4-2v8l-4-2" />
    </svg>
  )
}

function DashboardIconArchive(props: IconProps) {
  const { className, ...rest } = props
  return (
    <svg
      className={className ?? 'h-[1.125rem] w-[1.125rem]'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <rect x="4" y="4" width="16" height="5" rx="1" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
    </svg>
  )
}

function mediaKindIcon(kind: MediaKind): ReactNode {
  const className = 'h-4 w-4'

  switch (kind) {
    case 'image':
      return <DashboardIconImage className={className} />
    case 'pdf':
    case 'document':
      return <DashboardIconFileText className={className} />
    case 'audio':
      return <DashboardIconMic className={className} />
    case 'video':
      return <DashboardIconVideo className={className} />
    case 'archive':
      return <DashboardIconArchive className={className} />
    default:
      return <DashboardIconFile className={className} />
  }
}

function AttachmentDownloadButton({ fileId }: { fileId: string }) {
  const [state, formAction, isPending] = useActionState(
    downloadFileAction,
    initialDownloadState,
  )
  const handledUrlRef = useRef<string | null>(null)

  useEffect(() => {
    handledUrlRef.current = null
  }, [fileId])

  useEffect(() => {
    if (state.success && state.downloadUrl && handledUrlRef.current !== state.downloadUrl) {
      handledUrlRef.current = state.downloadUrl
      window.location.assign(state.downloadUrl)
    }
  }, [state.success, state.downloadUrl])

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="fileId" value={fileId} />
      <button
        type="submit"
        disabled={isPending}
        className={aosWorkspaceActionClassName}
      >
        {isPending ? '…' : 'Öffnen'}
      </button>
      {state.error ? (
        <p className="mt-0.5 text-[10px] leading-tight text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}

export function InformationAttachmentSection({
  attachments,
}: InformationAttachmentSectionProps) {
  return (
    <section aria-label="Anhänge" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Anhänge"
        accent="neutral"
        count={attachments.length}
        icon={<DashboardIconFile className="h-4 w-4" />}
      />

      {attachments.length === 0 ? (
        <p className={aosWorkspaceMetaClassName}>Keine Anhänge</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {attachments.map((attachment) => {
            const { file, relationId } = attachment

            if (!file) {
              return (
                <li key={relationId} className="flex items-center gap-2.5 py-2.5">
                  <span className="shrink-0 text-zinc-400" aria-hidden="true">
                    <DashboardIconFile className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-500">
                      Datei nicht verfügbar
                    </p>
                    <p className={aosWorkspaceMetaClassName}>
                      Die Datei fehlt oder wurde gelöscht.
                    </p>
                  </div>
                </li>
              )
            }

            const kind = classifyMediaKind(file.mime_type, file.filename)

            return (
              <li key={relationId} className="flex items-center gap-2.5 py-2.5">
                <span className="shrink-0 text-zinc-500" aria-hidden="true">
                  {mediaKindIcon(kind)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-zinc-900" title={file.filename}>
                    {file.filename}
                  </p>
                  <p className={aosWorkspaceMetaClassName}>
                    {formatFileSize(file.size_bytes)}
                  </p>
                </div>
                <AttachmentDownloadButton fileId={file.id} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
