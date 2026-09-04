'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { EmptyState } from '@/components/app/empty-state'
import { WorkspaceFrame, WorkspaceSplit } from '@/components/app/workspace'
import { FileDetailPanel } from '@/features/files/components/file-detail-panel'
import { FileEmptyDetail } from '@/features/files/components/file-empty-detail'
import { FileList } from '@/features/files/components/file-list'
import { FileUploadZone } from '@/features/files/components/file-upload-zone'
import type { FileRecord } from '@/features/files/types/file'

type FilesWorkspaceProps = {
  files: FileRecord[]
  initialFileId?: string | null
}

export function FilesWorkspace({ files, initialFileId = null }: FilesWorkspaceProps) {
  const router = useRouter()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => {
    if (!initialFileId) {
      return null
    }

    return files.some((file) => file.id === initialFileId) ? initialFileId : null
  })

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId]
  )

  const refreshFiles = useCallback(() => {
    router.refresh()
  }, [router])

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId)
  }, [])

  const handleUploaded = useCallback(
    (fileId: string) => {
      setSelectedFileId(fileId)
      refreshFiles()
    },
    [refreshFiles]
  )

  const handleBackToList = useCallback(() => {
    setSelectedFileId(null)
  }, [])

  const handleDeleted = useCallback(() => {
    setSelectedFileId(null)
    refreshFiles()
  }, [refreshFiles])

  const showMobileDetail = selectedFile !== null
  const totalCount = files.length
  const countLabel =
    totalCount === 0
      ? 'Noch keine Dateien'
      : totalCount === 1
        ? '1 Datei'
        : `${totalCount} Dateien`

  return (
    <WorkspaceFrame compact meta={countLabel}>
      <WorkspaceSplit
        listLabel="Dateiliste und Upload"
        detailLabel="Dateidetails"
        showMobileDetail={showMobileDetail}
        list={
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <FileUploadZone onUploaded={handleUploaded} />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {totalCount === 0 ? (
                <EmptyState
                  title="Noch keine Dateien"
                  description="Wählen Sie Dateien aus oder legen Sie sie oben ab. Nach dem Upload erscheinen sie hier."
                />
              ) : (
                <FileList
                  files={files}
                  selectedFileId={selectedFileId}
                  onSelectFile={handleSelectFile}
                />
              )}
            </div>
          </div>
        }
        detail={
          selectedFile ? (
            <FileDetailPanel
              key={selectedFile.id}
              file={selectedFile}
              onBack={handleBackToList}
              onDeleted={handleDeleted}
            />
          ) : (
            <FileEmptyDetail />
          )
        }
      />
    </WorkspaceFrame>
  )
}
