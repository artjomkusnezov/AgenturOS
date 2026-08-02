'use client'

import type { ReactNode, SVGProps } from 'react'

import {
  DashboardIconFile,
  DashboardIconFileText,
  DashboardIconImage,
  DashboardIconMic,
} from '@/features/dashboard/components/dashboard-icons'
import { MediaOpenButton } from '@/features/files/components/media-open-button'
import { classifyMediaKind, type MediaKind } from '@/features/files/lib/classify-media-kind'
import { formatFileSize } from '@/features/files/lib/format-file-label'
import type { MediaDownloadAction } from '@/features/files/types/document-media'
import type { FileRecord } from '@/features/files/types/file'
import { aosWorkspaceMetaClassName } from '@/lib/design-system'

type IconProps = SVGProps<SVGSVGElement>

function MediaIconVideo(props: IconProps) {
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

function MediaIconArchive(props: IconProps) {
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
      return <MediaIconVideo className={className} />
    case 'archive':
      return <MediaIconArchive className={className} />
    default:
      return <DashboardIconFile className={className} />
  }
}

type GenericAttachmentProps = {
  file: FileRecord | null
  openAction: MediaDownloadAction
  openExtraFields?: Record<string, string>
  actions?: ReactNode
}

export function GenericAttachment({
  file,
  openAction,
  openExtraFields,
  actions,
}: GenericAttachmentProps) {
  if (!file) {
    return (
      <li className="flex items-center gap-2.5 py-2.5">
        <span className="shrink-0 text-zinc-400" aria-hidden="true">
          <DashboardIconFile className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-zinc-500">Datei nicht verfügbar</p>
          <p className={aosWorkspaceMetaClassName}>Die Datei fehlt oder wurde gelöscht.</p>
        </div>
      </li>
    )
  }

  const kind = classifyMediaKind(file.mime_type, file.filename)

  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <span className="shrink-0 text-zinc-500" aria-hidden="true">
        {mediaKindIcon(kind)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-zinc-900" title={file.filename}>
          {file.filename}
        </p>
        <p className={aosWorkspaceMetaClassName}>{formatFileSize(file.size_bytes)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <MediaOpenButton fileId={file.id} action={openAction} extraFields={openExtraFields} />
        {actions}
      </div>
    </li>
  )
}
